package ro.platformamedicala.dto.auth;

import jakarta.validation.constraints.*;

import java.util.UUID;


public class RegisterRequestDTO {
    @NotBlank
    @Size(min = 3, max = 30)
    public String username;

    @NotBlank
    @Size(max = 50)
    public String firstName;

    @NotBlank
    @Size(max = 50)
    public String lastName;

    @NotBlank
    @Email
    public String email;

    @NotBlank
    @Size(min = 8, message = "Parola trebuie sa aiba minim 8 caractere")
    public String password;

    @NotNull
    public UUID facultyId;

    @NotNull
    @Min(1)
    @Max(6)
    public Integer yearOfStudy;
}
