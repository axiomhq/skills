import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SKILL = Path(__file__).resolve().parents[1]
STUB = '''#!/usr/bin/env bash
printf '%s\t%s\t%s\n' "$0" "$#" "${1:-}" >> "$TEST_CALLS"
case "$(basename "$0")" in
    get-user-id) echo test-user ;;
    axiom-api)
        case "${3:-}" in
            /v2/notifiers|/v2/monitors)
                if [[ "$2" == GET ]]; then echo '[]'; else exit 73; fi ;;
            *) echo '{"tables":[{"columns":[[],[]]}]}' ;;
        esac ;;
    *) exit 73 ;;
esac
'''


class SkillPathsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="axiom plugin paths ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.skills = self.root / "plugin cache" / "skills"
        self.skill = self.skills / "controlling-costs"
        shutil.copytree(SKILL, self.skill, ignore=shutil.ignore_patterns("__pycache__"))
        self.legacy = self.root / "legacy skills"
        self.log = self.root / "calls"
        self.env = os.environ.copy()
        for name in ("AXIOM_QUERY", "AXIOM_API", "GET_USER_ID", "DASHBOARD_CREATE"):
            self.env.pop(name, None)
        self.env["TEST_CALLS"] = str(self.log)
        self.bin = self.root / "test bin"
        self.bin.mkdir()
        self.env["PATH"] = str(self.bin) + os.pathsep + self.env["PATH"]
        self.env["TEST_TEMP_FILE"] = str(self.root / "dashboard.json")
        self.write_executable(self.bin / "mktemp", '#!/bin/bash\nprintf "%s\\n" "$TEST_TEMP_FILE"\n')
        # setup only checks legacy config metadata; do not read real credentials.
        self.write_executable(self.bin / "grep", "#!/bin/bash\necho 0\n")

    def write_executable(self, path, content=STUB):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        path.chmod(0o755)
        return path

    def dependency(self, skill, script, root=None):
        return self.write_executable((root or self.skills) / skill / "scripts" / script)

    def resolve(self, skill="sre", script="axiom-query", override=""):
        helper = self.skill / "scripts/lib/skill-paths.sh"
        result = subprocess.run(
            ["bash", "-c", 'source "$1"; resolve_skill_script "$2" "$3" "$4" "$5"',
             "test", str(helper), skill, script, override, str(self.legacy)],
            cwd=self.root, env=self.env, capture_output=True, text=True, check=True,
        )
        return Path(result.stdout.strip())

    def invoke(self, script, arguments, expected_calls, status, env=None, directory=None):
        self.log.write_text("")
        result = subprocess.run(
            ["bash", str((directory or self.skill) / "scripts" / script), *arguments],
            cwd=self.root, env=env or self.env, capture_output=True, text=True, timeout=10,
        )
        self.assertEqual(result.returncode, status, result.stdout + result.stderr)
        calls = [line.split("\t") for line in self.log.read_text().splitlines()]
        self.assertEqual([row[0] for row in calls], [str(p) for p in expected_calls])
        # A deployment containing a space must remain one argument.
        self.assertTrue(all(row[2] == "test deployment" for row in calls))
        return result

    def test_bundled_scripts_precede_legacy_installs(self):
        expected = self.dependency("sre", "axiom-query")
        self.dependency("sre", "axiom-query", self.legacy)
        self.assertEqual(self.resolve(), expected)

    def test_sre_directory_alias_and_legacy_fallback(self):
        for root in (self.skills, self.legacy):
            for name in ("sre", "axiom-sre"):
                with self.subTest(root=root, name=name):
                    expected = self.dependency(name, "axiom-query", root)
                    self.assertEqual(self.resolve(), expected)
                    expected.unlink()

    def test_dashboard_legacy_fallback(self):
        expected = self.dependency("building-dashboards", "dashboard-create", self.legacy)
        self.assertEqual(self.resolve("building-dashboards", "dashboard-create"), expected)

    def test_override_is_authoritative_even_if_missing(self):
        self.dependency("sre", "axiom-query")
        override = self.root / "custom query"
        self.assertEqual(self.resolve(override=str(override)), override)

    def test_nonexecutable_sibling_uses_legacy_script(self):
        sibling = self.dependency("sre", "axiom-query")
        sibling.chmod(0o644)
        expected = self.dependency("sre", "axiom-query", self.legacy)
        self.assertEqual(self.resolve(), expected)

    def test_missing_dependency_preserves_help_and_reports_path(self):
        expected = self.skills / "sre/scripts/axiom-query"
        self.assertEqual(self.resolve(), expected)
        env = dict(self.env, AXIOM_QUERY=str(expected))
        result = self.invoke("baseline-stats", ["-d", "test deployment", "-a", "audit"], [], 1, env)
        self.assertIn(str(expected), result.stderr)
        result = self.invoke("baseline-stats", ["--help"], [], 1, env)
        self.assertIn("Usage:", result.stdout)
        self.assertNotIn("not found", result.stderr)

    def test_entrypoints_use_bundled_helpers_from_relocated_install(self):
        for sre_name in ("sre", "axiom-sre"):
            with self.subTest(sre_name=sre_name):
                query = self.dependency(sre_name, "axiom-query")
                api = self.dependency(sre_name, "axiom-api")
                user = self.dependency("building-dashboards", "get-user-id")
                create = self.dependency("building-dashboards", "dashboard-create")
                base = ["-d", "test deployment"]
                self.invoke("baseline-stats", base + ["-a", "audit"], [query], 73)
                self.invoke("analyze-query-coverage", base + ["-D", "logs"], [api, api], 0)
                self.invoke("list-notifiers", base, [api], 0)
                self.invoke("create-monitors", base + ["-a", "audit", "-c", "1000"], [api, api], 73)
                self.invoke("deploy-dashboard", base + ["-a", "audit"], [user, create], 73)
                result = subprocess.run(
                    ["bash", str(self.skill / "scripts/setup")], cwd=self.root,
                    env=self.env, capture_output=True, text=True, timeout=10,
                )
                self.assertIn("✓ axiom-sre skill found", result.stdout)
                self.assertIn("✓ building-dashboards skill found", result.stdout)
                query.unlink()
                api.unlink()

    def test_entrypoints_keep_explicit_overrides(self):
        for script in ("axiom-api", "axiom-query"):
            self.dependency("sre", script)
        overrides = self.root / "override tools"
        query = self.write_executable(overrides / "axiom-query")
        api = self.write_executable(overrides / "axiom-api")
        user = self.write_executable(overrides / "get-user-id")
        create = self.write_executable(overrides / "dashboard-create")
        env = dict(self.env, AXIOM_QUERY=str(query), AXIOM_API=str(api),
                   GET_USER_ID=str(user), DASHBOARD_CREATE=str(create))
        base = ["-d", "test deployment"]
        self.invoke("baseline-stats", base + ["-a", "audit"], [query], 73, env)
        self.invoke("list-notifiers", base, [api], 0, env)
        self.invoke("deploy-dashboard", base + ["-a", "audit"], [user, create], 73, env)

    def test_symlinked_skill_directory(self):
        query = self.dependency("sre", "axiom-query")
        link = self.root / "linked skill"
        link.symlink_to(self.skill, target_is_directory=True)
        self.invoke("baseline-stats", ["-d", "test deployment", "-a", "audit"], [query], 73,
                    directory=link)


if __name__ == "__main__":
    unittest.main()
