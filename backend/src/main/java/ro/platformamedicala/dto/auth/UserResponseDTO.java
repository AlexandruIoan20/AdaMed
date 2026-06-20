package ro.platformamedicala.dto.auth;

import ro.platformamedicala.entities.User;
import ro.platformamedicala.entities.UserRole;

import java.util.UUID;

public class UserResponseDTO {
    public UUID id;
    public String username;
    public String firstName;
    public String lastName;
    public String email;
    public UserRole role;
    public UUID facultyId;
    public Integer yearOfStudy;

    public static UserResponseDTO fromEntity (User user) {
        UserResponseDTO dto = new UserResponseDTO();
        dto.id = user.getId();
        dto.username = user.getUsername();
        dto.firstName = user.getFirstName();
        dto.lastName = user.getLastName();
        dto.email = user.getEmail();
        dto.role = user.getRole();
        dto.facultyId = user.getFaculty().getId();
        dto.yearOfStudy = user.getYearOfStudy();

        return dto;
    }
}
