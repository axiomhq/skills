import { readdir } from 'node:fs/promises'
import type { PluginAPI } from '@ampcode/plugin'

export const description =
	'Axiom skills for searching logs, querying metrics, and following traces: incident response, dashboards, alerts, cost control, ingest, and Splunk query translation.'

// Amp loads this repository as a directory plugin but does not scan skills/ on its own,
// so register every skill directory, as the other harness manifests do with "./skills/".
export default async function (amp: PluginAPI) {
	const entries = await readdir(new URL('./skills/', import.meta.url), { withFileTypes: true })
	for (const entry of entries) {
		if (entry.isDirectory()) await amp.registerSkill({ path: `skills/${entry.name}` })
	}
}
