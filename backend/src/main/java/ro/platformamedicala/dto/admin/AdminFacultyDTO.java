package ro.platformamedicala.dto.admin;

import ro.platformamedicala.entities.Faculty;

import java.util.UUID;

public class AdminFacultyDTO {
    public UUID id;
    public String name;
    public String description;
    public long subjectCount;
    public long userCount;

    public static AdminFacultyDTO of(Faculty faculty, long subjectCount, long userCount) {
        AdminFacultyDTO dto = new AdminFacultyDTO();
        dto.id = faculty.getId();
        dto.name = faculty.getName();
        dto.description = faculty.getDescription();
        dto.subjectCount = subjectCount;
        dto.userCount = userCount;
        return dto;
    }
}
