package ro.platformamedicala.dto.quiz;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public class SubmitAnswerRequestDTO {
    @NotNull
    public UUID questionId;

    @NotNull
    public List<UUID> selectedAnswerIds;
}
