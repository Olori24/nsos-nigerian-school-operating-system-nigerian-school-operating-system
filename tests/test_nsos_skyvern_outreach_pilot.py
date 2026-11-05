"""Fast, offline unit tests for the NSOS Skyvern pilot's safety helpers."""
import importlib.util
import pathlib
import unittest

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "nsos-skyvern-outreach-pilot.py"
SPEC = importlib.util.spec_from_file_location("nsos_skyvern_pilot", MODULE_PATH)
PILOT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PILOT)


class PilotSafetyTests(unittest.TestCase):
    def test_rejects_plain_http(self):
        with self.assertRaises(ValueError):
            PILOT.validate_public_https_url("http://example.com")

    def test_rejects_localhost(self):
        with self.assertRaises(ValueError):
            PILOT.validate_public_https_url("https://localhost")

    def test_rejects_private_ip_literal(self):
        with self.assertRaises(ValueError):
            PILOT.validate_public_https_url("https://127.0.0.1")

    def test_rejects_credentials(self):
        with self.assertRaises(ValueError):
            PILOT.validate_public_https_url("https://user:pass@example.com")

    def test_rejects_nonstandard_port(self):
        with self.assertRaises(ValueError):
            PILOT.validate_public_https_url("https://example.com:8443")

    def test_same_host_requires_exact_https_host(self):
        self.assertTrue(PILOT.same_host("https://school.example/contact", "school.example"))
        self.assertFalse(PILOT.same_host("https://other.example/contact", "school.example"))
        self.assertFalse(PILOT.same_host("http://school.example/contact", "school.example"))
        self.assertFalse(PILOT.same_host("https://sub.school.example/contact", "school.example"))

    def test_finds_nested_structured_payload(self):
        expected = {"organisation_name": "Example School", "evidence_urls": ["https://school.example"]}
        self.assertEqual(PILOT.find_payload({"result": {"output": expected}}), expected)

    def test_parses_json_string_payload(self):
        expected = {"organisation_name": "Example School", "evidence_urls": ["https://school.example"]}
        self.assertEqual(PILOT.find_payload('{"data": {"organisation_name": "Example School", "evidence_urls": ["https://school.example"]}}'), expected)


if __name__ == "__main__":
    unittest.main()
