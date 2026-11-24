# Go recipe

Go has no in-process zero-code agent, so this recipe adds one small bootstrap package that reads all exporter settings from `OTEL_*` environment variables. If the app already configures OTel providers, extend them instead.

## 1. Check and install modules

```bash
go get go.opentelemetry.io/otel \
  go.opentelemetry.io/otel/sdk \
  go.opentelemetry.io/otel/sdk/metric \
  go.opentelemetry.io/otel/sdk/log \
  go.opentelemetry.io/contrib/exporters/autoexport \
  go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp \
  go.opentelemetry.io/contrib/instrumentation/runtime \
  go.opentelemetry.io/contrib/bridges/otelslog
go mod tidy
```

`go get` resolves current compatible versions. Check that `go.mod`'s Go version satisfies them, and keep the `otel` and `contrib` module families on versions released together. Do not write versions from memory. For other frameworks or clients (gRPC, gin, database drivers), find the matching `contrib` instrumentation module with `go list -m -versions <module>`.

## 2. Add the bootstrap

```go
package telemetry

import (
	"context"
	"errors"

	"go.opentelemetry.io/contrib/exporters/autoexport"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/propagation"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// Setup configures traces, metrics, and logs from OTEL_* environment variables.
// Call the returned shutdown once before the process exits.
func Setup(ctx context.Context) (func(context.Context) error, error) {
	res, err := resource.New(ctx, resource.WithFromEnv(), resource.WithTelemetrySDK(), resource.WithHost())
	if err != nil {
		return nil, err
	}

	spanExp, err := autoexport.NewSpanExporter(ctx)
	if err != nil {
		return nil, err
	}
	tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(spanExp), sdktrace.WithResource(res))

	reader, err := autoexport.NewMetricReader(ctx)
	if err != nil {
		return nil, errors.Join(err, tp.Shutdown(ctx))
	}
	mp := sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader), sdkmetric.WithResource(res))

	logExp, err := autoexport.NewLogExporter(ctx)
	if err != nil {
		return nil, errors.Join(err, tp.Shutdown(ctx), mp.Shutdown(ctx))
	}
	lp := sdklog.NewLoggerProvider(sdklog.WithProcessor(sdklog.NewBatchProcessor(logExp)), sdklog.WithResource(res))

	otel.SetTracerProvider(tp)
	otel.SetMeterProvider(mp)
	global.SetLoggerProvider(lp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))

	return func(ctx context.Context) error {
		return errors.Join(tp.Shutdown(ctx), mp.Shutdown(ctx), lp.Shutdown(ctx))
	}, nil
}
```

`autoexport` honors `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER`, and `OTEL_LOGS_EXPORTER` (`otlp`, `console`, or `none`) and the OTLP endpoint, header, and protocol variables. An unset exporter variable means `otlp`, and the default protocol is `http/protobuf`.

## 3. Wire it into `main`

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

shutdown, err := telemetry.Setup(ctx)
if err != nil {
	log.Fatal(err)
}
defer func() { _ = shutdown(context.Background()) }()

if err := runtime.Start(); err != nil { // contrib runtime metrics
	log.Print(err)
}

handler := otelhttp.NewHandler(mux, "server")
logger := otelslog.NewLogger("billing-api") // or fan out to the existing slog handler too
```

Wrap outgoing clients with `otelhttp.NewTransport`. Pass the request `ctx` to the logger (`logger.InfoContext(ctx, ...)`) so records carry trace context. To keep existing stdout logging, send records to both the existing handler and the OTel handler rather than replacing it.

## 4. Configure with environment variables

Use the same block as the other recipes: set `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER`, and `OTEL_LOGS_EXPORTER` each to `otlp` if enabled or `none` if not, and set endpoints and headers only for enabled signals; see [axiom-setup.md](../axiom-setup.md). `autoexport` treats an unset variable as `otlp`, so a disabled signal must be `none` or it will still try to export. Set `service.instance.id` per process in `OTEL_RESOURCE_ATTRIBUTES` (for example from the pod name), because the Go SDK does not generate one.

## Pitfalls

- **Exit paths skip `defer`.** `os.Exit`, `log.Fatal`, and unhandled signals bypass shutdown, and the process exits 0 having sent nothing. Shut down on `SIGTERM` via the signal context, and call shutdown before any explicit exit in CLIs and jobs.
- **Context not propagated.** Spans and logs only correlate when the request `ctx` is passed down.
- **Bounded span names.** Name server spans by route template, not raw path.

## Local check

Set each enabled signal's exporter to `console` and leave disabled signals at `none`, run one operation, then set each exporter back to its previous value: `otlp` for enabled signals, `none` for disabled ones. See [verify.md](../verify.md#local-check).
