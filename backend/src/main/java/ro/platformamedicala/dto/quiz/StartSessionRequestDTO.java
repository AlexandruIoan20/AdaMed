package ro.platformamedicala.dto.quiz;

import jakarta.validation.constraints.NotNull;

import ro.platformamedicala.entities.SessionMode;

import java.util.UUID;

public class StartSessionRequestDTO {
    @NotNull
    public UUID subjectId;

    public SessionMode mode = SessionMode.LEARNING;
}
