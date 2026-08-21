# Sync Gmail on application startup

After an initial date-range sync is configured in Settings, opening the local tracker starts Gmail synchronization from the last successful sync timestamp, using message-ID deduplication as a safeguard. Synchronization runs in the background, writes only Inbox Items, and reports its progress and result through Sync Activity; it never updates the Dashboard directly.
