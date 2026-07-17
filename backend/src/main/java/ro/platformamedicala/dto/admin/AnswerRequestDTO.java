package ro.platformamedicala.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class AnswerRequestDTO {
    public UUID id;

    @NotBlank
    public String text;

    public String imageUrl;

    @NotNull
    public Boolean isCorrect;

    public Integer position;
}
