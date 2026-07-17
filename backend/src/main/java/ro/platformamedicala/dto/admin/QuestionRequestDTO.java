package ro.platformamedicala.dto.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class QuestionRequestDTO {
    @NotBlank
    public String text;

    public String explanation;

    @NotNull
    @Valid
    public List<AnswerRequestDTO> answers;
}
