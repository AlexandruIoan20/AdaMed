package ro.platformamedicala.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SubjectRequestDTO {
    @NotBlank
    @Size(max = 100)
    public String name;

    @Size(max = 255)
    public String description;
}
