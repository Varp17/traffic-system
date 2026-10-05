import datetime
import unittest
from ai_harness.core.timer import TimeBudgetManager, parse_duration_to_seconds


class TestTimerBudget(unittest.TestCase):
    def test_duration_parsing(self):
        self.assertEqual(parse_duration_to_seconds("8h"), 28800.0)
        self.assertEqual(parse_duration_to_seconds("1hr"), 3600.0)
        self.assertEqual(parse_duration_to_seconds("30m"), 1800.0)
        self.assertEqual(parse_duration_to_seconds("45s"), 45.0)
        self.assertEqual(parse_duration_to_seconds("100"), 100.0)

    def test_timer_countdown_and_drain(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        timer = TimeBudgetManager(budget_seconds=10.0, started_at=now)

        self.assertFalse(timer.is_expired())
        self.assertFalse(timer.is_draining())
        self.assertGreater(timer.remaining_seconds, 0)

        # Request graceful drain
        timer.request_drain()
        self.assertTrue(timer.is_draining())

    def test_timer_expired_triggers_drain(self):
        past = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=200)
        timer = TimeBudgetManager(budget_seconds=10.0, started_at=past)

        self.assertTrue(timer.is_expired())
        self.assertTrue(timer.is_draining())
        self.assertEqual(timer.remaining_seconds, 0.0)


if __name__ == "__main__":
    unittest.main()
