package ro.platformamedicala.dto.admin;

import ro.platformamedicala.entities.User;
import ro.platformamedicala.entities.UserRole;

import java.time.LocalDateTime;
import java.util.UUID;

public class AdminUserDTO {
    public UUID id;
    public String username;
    public String firstName;
    public String lastName;
    public String email;
    public Boolean emailVerified;
    public UUID facultyId;
    public String facultyName;
    public Integer yearOfStudy;
    public UserRole role;
    public LocalDateTime createdAt;

    public static AdminUserDTO fromEntity(User user) {
        AdminUserDTO dto = new AdminUserDTO();
        dto.id = user.getId();
        dto.username = user.getUsername();
        dto.firstName = user.getFirstName();
        dto.lastName = user.getLastName();
        dto.email = user.getEmail();
        dto.emailVerified = user.getEmailVerified();
        dto.facultyId = user.getFaculty() != null ? user.getFaculty().getId() : null;
        dto.facultyName = user.getFaculty() != null ? user.getFaculty().getName() : null;
        dto.yearOfStudy = user.getYearOfStudy();
        dto.role = user.getRole();
        dto.createdAt = user.getCreatedAt();
        return dto;
    }
}
