# Changelog

## [1.2.1](https://github.com/axiomhq/skills/compare/v1.2.0...v1.2.1) (2026-10-29)


### Fixes

* **sre:** fail Axiom helpers on HTTP errors ([2cbcca2](https://github.com/axiomhq/skills/commit/2cbcca2965ea15649a378b5fa8611937853241c3))
* **sre:** fail Axiom helpers on HTTP errors ([ec97058](https://github.com/axiomhq/skills/commit/ec97058876ded8d74ad417d7ce4ffd8b0c62120e)), closes [#111](https://github.com/axiomhq/skills/issues/111)

## [1.2.0](https://github.com/axiomhq/skills/compare/v1.1.2...v1.2.0) (2026-10-28)


### Features

* add axiom-agent-created-orgs skill ([e832687](https://github.com/axiomhq/skills/commit/e832687b931d26300839d3bba9c6bf5a6444a24b))
* add axiom-ingest and axiom-agent-created-orgs skills ([057284d](https://github.com/axiomhq/skills/commit/057284d35f797998ba854bb50ab0efdbe9fa02dc))
* add axiom-ingest skill ([c2df0c9](https://github.com/axiomhq/skills/commit/c2df0c9ef2aa320859244c95ce4c4d877d6a4a07))
* prefix remaining skills with axiom- ([a392cdb](https://github.com/axiomhq/skills/commit/a392cdb775b3514fd3e2acb4da75f603d1385ebc))
* prefix remaining skills with axiom- ([6fcac1f](https://github.com/axiomhq/skills/commit/6fcac1f6613e5842d53e8f7acf59783a1a6d1be2))


### Fixes

* **axiom-ingest:** handle tokens that can't create datasets or query ([0930953](https://github.com/axiomhq/skills/commit/09309535f2c7a5ff90ea37a97ab86781de5a0a54))
* **building-dashboards:** avoid duplicate formatted metric units ([c97a587](https://github.com/axiomhq/skills/commit/c97a587b03361e1f6ab5b2971c00a34535f2b898))
* **building-dashboards:** emit Statistic units the Console renders ([85ab2a3](https://github.com/axiomhq/skills/commit/85ab2a374eda6868880c3c78208b9871737f18d8))
* **building-dashboards:** flag every LogStream operator the Console cannot stream ([3210413](https://github.com/axiomhq/skills/commit/3210413f95b936e77607988306ab18e3062a6b75))
* **building-dashboards:** match what the Console renders and the API accepts ([b2176a1](https://github.com/axiomhq/skills/commit/b2176a1af451fa198c54034826e904856537c7d0))
* **building-dashboards:** name the MPL Statistic result unit with custom_unit ([c9bfabb](https://github.com/axiomhq/skills/commit/c9bfabbf0530fd0f8887c01176b74a11ebe73905))
* **building-dashboards:** only skip custom_unit for a leading set statement ([0d9b306](https://github.com/axiomhq/skills/commit/0d9b30625406b94a431964bb1cf9ebe831328547))
* **building-dashboards:** reject roundTo on a Statistic before create ([ea064cb](https://github.com/axiomhq/skills/commit/ea064cb29a9140502f08d7c9e8b3ec6d8c3f13cd))
* **building-dashboards:** restore default chart sizes, raise Pie to 4x5 ([9105993](https://github.com/axiomhq/skills/commit/9105993e9cb0b83d0d30f5b1ef6aafc4acf5b160))
* **building-dashboards:** stop declaring $__interval in mpl-validate-chart ([00617f1](https://github.com/axiomhq/skills/commit/00617f163914c2ef72adb996cc86c316d7aa419f))
* **building-dashboards:** stop requiring take in LogStream queries ([405bca5](https://github.com/axiomhq/skills/commit/405bca5d20b12eaffd978910b60493676dbaebfa))
* **building-dashboards:** use the Console's chart sizes in layout-pack ([3105400](https://github.com/axiomhq/skills/commit/310540026d079a0a1778125e97a37adca2d88af4))
* emit dashboard sections from the building-dashboards skill ([192670f](https://github.com/axiomhq/skills/commit/192670f9ffb5519aee99bc0fdc0307a77455e5b4))
* emit dashboard sections from the building-dashboards skill ([ef913cf](https://github.com/axiomhq/skills/commit/ef913cfe10a45b24e401f684182e7520453f889e))
* open pull requests for automated skill updates ([9f00143](https://github.com/axiomhq/skills/commit/9f00143bc31bbe8c35c8fd19059ddae7e4593d77))
* prevent stale and failed eval baseline updates ([a49853a](https://github.com/axiomhq/skills/commit/a49853ae65c757fc589589493ace4084d24eea3b))
* reject chart sectionId when the dashboard has no sections ([b03fea0](https://github.com/axiomhq/skills/commit/b03fea03de57a2c24e90386c94d39c59b3c20350))
* route hosted APL queries to the regional edge ([ebcbd50](https://github.com/axiomhq/skills/commit/ebcbd5046bb09f867b292efdba4d7513f45744e2))
* route hosted APL queries to the regional edge ([c1924d7](https://github.com/axiomhq/skills/commit/c1924d75c8596c575ccf32f83ce14e7129b99100))
* send every APL query to /v1/query/_apl ([f63e997](https://github.com/axiomhq/skills/commit/f63e997e928927bb64858a0cec8cf3ee7e2da2b8))
* serialize baseline updates per skill ([d14945a](https://github.com/axiomhq/skills/commit/d14945a64b4e5ab77712f4067b8b5caea1e471a3))


### Documentation

* **building-dashboards:** use example names in comments and tests ([5e3081d](https://github.com/axiomhq/skills/commit/5e3081d4d2914940c2f76b42d0ddfbd24757edc1))
* remove cost claims from plugin descriptions ([36cd208](https://github.com/axiomhq/skills/commit/36cd208a298f54ca80adcc92ea3f06b7b207b030))
* remove cost claims from plugin descriptions ([38a769f](https://github.com/axiomhq/skills/commit/38a769f05144efcbb4cb2940e4a99f8cfded3d07))

## [1.1.2](https://github.com/axiomhq/skills/compare/v1.1.1...v1.1.2) (2026-10-07)


### Fixes

* add Claude plugin support and terms URLs ([6f8ec0e](https://github.com/axiomhq/skills/commit/6f8ec0e4bc92f45d9d7d850e39150c017c6da390))
* add Claude plugin support and terms URLs ([5275671](https://github.com/axiomhq/skills/commit/527567108e358ae4e77ebe796b8f293d325d8889))
* preserve dashboard safeguards when retiring metrics skill ([6c4da82](https://github.com/axiomhq/skills/commit/6c4da82dc42514c5a4b82cc135e53e9e1c565280))


### Documentation

* simplify metrics workflows after skill retirement ([ca5168d](https://github.com/axiomhq/skills/commit/ca5168dc160a56a3899fce3b77e9bf04009ebf92))

## [1.1.1](https://github.com/axiomhq/skills/compare/v1.1.0...v1.1.1) (2026-10-07)


### Fixes

* add Claude plugin icon and privacy policy ([479f228](https://github.com/axiomhq/skills/commit/479f22872155c132e3208a3be423fa8d4b101681))
* add Claude plugin icon and privacy policy ([f14b53b](https://github.com/axiomhq/skills/commit/f14b53be7e3d3ea127b338830a4d5ba5f3371f3c))


### SRE skill

* sync from gilfoyle@631b5ee ([93d60c7](https://github.com/axiomhq/skills/commit/93d60c7d08838921e74b078b73d83936ec3f41bd))

## 1.1.0 (2026-10-02)


### Features

* add Claude Code plugin distribution ([cea678d](https://github.com/axiomhq/skills/commit/cea678d44c674b7c94cac75071e6249a961c561c))
* add Codex plugin distribution ([d24378a](https://github.com/axiomhq/skills/commit/d24378a23a31a9225c02d84447a3087124004769))
* add Cursor plugin distribution ([9082075](https://github.com/axiomhq/skills/commit/90820757bce9f90c56638defd92c8bda9da91468))
* add Gemini CLI extension distribution ([ed3fb29](https://github.com/axiomhq/skills/commit/ed3fb296b4e4d1d092f75cae5bef714347f0feba))


### Fixes

* **building-dashboards:** choose aggregation functions by panel intent ([78e4f10](https://github.com/axiomhq/skills/commit/78e4f10053fcf232482beb11ceb52831f370fdec))
* **building-dashboards:** choose aggregation functions by panel intent ([d6e1ec5](https://github.com/axiomhq/skills/commit/d6e1ec5780c82c6024b12c07cd8b07422a47d598))
* **building-dashboards:** use align for last-value statistic panels ([f80fdf6](https://github.com/axiomhq/skills/commit/f80fdf6e5828d1de74ed68d7301bc57004f3c4e2))
* prepare plugins for marketplace submission ([40ea6fb](https://github.com/axiomhq/skills/commit/40ea6fb910f25f17b7f6d30587eec77a934251d7))
* prepare plugins for marketplace submission ([4bbc167](https://github.com/axiomhq/skills/commit/4bbc1676c6a2b8eaa78f1cc5c5826d62fef67cfa))
* remove retired writing-evals skill ([51f1648](https://github.com/axiomhq/skills/commit/51f1648fc63772b864656915c6f8fdc2a533ef13))
* run evals through project package scripts ([e258a46](https://github.com/axiomhq/skills/commit/e258a4671fbca7accb0235c58e7ae44a439f02f1))
