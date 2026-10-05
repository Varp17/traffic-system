import unittest
from ai_harness.providers.base import BaseProvider
from ai_harness.providers.mock_provider import MockProvider
from ai_harness.providers.pool import KeySlot, ProviderPool


class TestKeyFailover(unittest.TestCase):
    def test_secret_hygiene_never_exposes_raw_keys(self):
        slot = KeySlot(
            slot_id="GEMINI_TEST",
            provider_type="gemini",
            model_name="gemini-1.5-pro",
            secret_key="AIzaSySECRET_DO_NOT_LEAK",
        )
        sanitized = slot.to_sanitized_dict()

        # Verify raw secret is absent from serialized dictionary
        self.assertNotIn("secret_key", sanitized)
        self.assertNotIn("AIzaSySECRET_DO_NOT_LEAK", str(sanitized))
        self.assertEqual(sanitized["key_slot"], "GEMINI_TEST")
        self.assertEqual(sanitized["provider"], "gemini")

    def test_provider_failover_mechanism(self):
        pool = ProviderPool()
        # Reset slots with controlled mocks
        failing_mock = MockProvider()
        failing_mock.should_fail = True
        failing_mock.max_failures_before_success = 100

        backup_mock = MockProvider()

        slot1 = KeySlot(slot_id="PRIMARY_SLOT", provider_type="mock", model_name="mock-1", status="available")
        slot2 = KeySlot(slot_id="BACKUP_SLOT", provider_type="mock", model_name="mock-2", status="available")

        pool.slots = [slot1, slot2]
        pool._instances["PRIMARY_SLOT"] = failing_mock
        pool._instances["BACKUP_SLOT"] = backup_mock

        checkpoints_saved = {"count": 0}

        def _on_failure_checkpoint():
            checkpoints_saved["count"] += 1

        resume_banners = []

        def _resume_gen():
            banner = "RESUME CONTEXT: Phase implementation active."
            resume_banners.append(banner)
            return banner

        # Execute
        res, active = pool.execute_with_failover(
            prompt="Generate module code",
            on_failure_checkpoint=_on_failure_checkpoint,
            resume_context_generator=_resume_gen,
        )

        # Assertions
        self.assertEqual(active.slot_id, "BACKUP_SLOT")
        self.assertIn(slot1.status, ("rate_limited", "exhausted"))
        self.assertEqual(checkpoints_saved["count"], 1)
        self.assertEqual(len(resume_banners), 1)
        self.assertTrue(len(res) > 0)


if __name__ == "__main__":
    unittest.main()
