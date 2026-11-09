// Amp loads a directory plugin from index.ts at its root. The plugin lives in .amp-plugin/.
export const description =
	'Axiom skills for searching logs, querying metrics, and following traces: incident response, dashboards, alerts, cost control, ingest, and Splunk query translation.'
export { default } from './.amp-plugin/index.ts'
