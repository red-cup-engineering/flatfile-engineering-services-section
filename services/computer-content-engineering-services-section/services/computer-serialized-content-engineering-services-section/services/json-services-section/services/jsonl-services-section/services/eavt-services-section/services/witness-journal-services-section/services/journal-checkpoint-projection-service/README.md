# Journal Checkpoint Projection Service

This service owns only checkpoint admission, event folding, and replay-delta
projection. File observation and journal persistence are separate effects
supplied by the composing application.
