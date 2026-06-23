import pytest
from app import _redact_key


class TestRedactKey:
    def test_redacts_key_from_text(self):
        text = "Error: failed with key=super_secret_key_12345"
        key = "super_secret_key_12345"
        result = _redact_key(text, key)
        assert key not in result
        assert "***" in result

    def test_redacts_short_key(self):
        text = "Error: auth failed for abc"
        key = "abc"
        result = _redact_key(text, key)
        assert key not in result
        assert "***" in result

    def test_redacts_long_key_prefix(self):
        text = "Error: token is eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longtoken"
        key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longtoken"
        result = _redact_key(text, key)
        assert key not in result
        assert "***" in result

    def test_empty_text_returns_empty(self):
        assert _redact_key("", "some_key") == ""

    def test_none_text_returns_none(self):
        assert _redact_key(None, "some_key") is None

    def test_empty_key_returns_text_unchanged(self):
        text = "Error: no key here"
        result = _redact_key(text, "")
        assert result == text

    def test_key_not_in_text_returns_text_unchanged(self):
        text = "Error: generic failure"
        result = _redact_key(text, "non_existent_key")
        assert result == text

    def test_multiple_occurrences_all_redacted(self):
        text = "key1=abc123 and key1=abc123 again"
        result = _redact_key(text, "abc123")
        assert result.count("***") == 2
        assert "abc123" not in result
