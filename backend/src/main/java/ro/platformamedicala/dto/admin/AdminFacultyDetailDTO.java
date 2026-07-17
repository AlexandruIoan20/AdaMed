package ro.platformamedicala.dto.admin;

import ro.platformamedicala.entities.Faculty;

import java.util.UUID;

public class AdminFacultyDetailDTO {
    public UUID id;
    public String name;
    public String description;
    public long subjectCount;
    public long userCount;

    public static AdminFacultyDetailDTO of(Faculty faculty, long subjectCount, long userCount) {
        AdminFacultyDetailDTO dto = new AdminFacultyDetailDTO();
        dto.id = faculty.getId();
        dto.name = faculty.getName();
        dto.description = faculty.getDescription();
        dto.subjectCount = subjectCount;
        dto.userCount = userCount;
        return dto;
    }
}
