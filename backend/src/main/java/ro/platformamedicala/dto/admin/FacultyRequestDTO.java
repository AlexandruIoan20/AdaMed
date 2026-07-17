package ro.platformamedicala.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class FacultyRequestDTO {
    @NotBlank
    @Size(max = 100)
    public String name;

    @Size(max = 500)
    public String description;
}
