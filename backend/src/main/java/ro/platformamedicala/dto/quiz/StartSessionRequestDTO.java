package ro.platformamedicala.dto.quiz;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class StartSessionRequestDTO {
    @NotNull
    public UUID subjectId;
}
