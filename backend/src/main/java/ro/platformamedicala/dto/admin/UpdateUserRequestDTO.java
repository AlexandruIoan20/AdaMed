package ro.platformamedicala.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ro.platformamedicala.entities.UserRole;

public class UpdateUserRequestDTO {
    @NotBlank
    @Size(max = 30)
    public String username;

    @NotNull
    public UserRole role;
}
