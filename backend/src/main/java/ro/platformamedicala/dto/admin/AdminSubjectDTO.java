package ro.platformamedicala.dto.admin;

import ro.platformamedicala.entities.Subject;

import java.util.UUID;

public class AdminSubjectDTO {
    public UUID id;
    public String name;
    public String description;
    public long facultyCount;

    public static AdminSubjectDTO of(Subject subject, long facultyCount) {
        AdminSubjectDTO dto = new AdminSubjectDTO();
        dto.id = subject.getId();
        dto.name = subject.getName();
        dto.description = subject.getDescription();
        dto.facultyCount = facultyCount;
        return dto;
    }
}
