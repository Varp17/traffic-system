"""Custom exceptions for the AI Autonomous Harness.
"""

class HarnessError(Exception):
    """Base exception for AI Harness errors."""
    pass


class StorageError(HarnessError):
    """Raised on file system or atomic checkpoint errors."""
    pass


class ProviderExhaustedError(HarnessError):
    """Raised when an API key or provider is exhausted or rate limited."""
    def __init__(self, provider: str, slot: str, message: str = "Provider quota exhausted"):
        self.provider = provider
        self.slot = slot
        super().__init__(f"[{provider}:{slot}] {message}")


class PipelineError(HarnessError):
    """Raised when a V-Model stage fails execution."""
    def __init__(self, phase: str, details: str):
        self.phase = phase
        self.details = details
        super().__init__(f"Pipeline failure in phase '{phase}': {details}")


class TimeBudgetExpiredError(HarnessError):
    """Raised when the 8-hour time budget has expired."""
    pass
