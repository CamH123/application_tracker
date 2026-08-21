# Require Ollama for Gmail sync

Gmail synchronization requires the local Ollama service to be available. If it is unavailable at preflight, synchronization fails before creating Inbox Items or marking messages processed, so the person can restore the required classifier rather than receive incomplete automation; manual tracking remains fully available. Later Gmail/API/network failures preserve completed messages and report a partial result that can be safely retried.
