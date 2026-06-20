package ro.platformamedicala.dto;

import ro.platformamedicala.entities.Faculty;

import java.util.UUID;

public class FacultyResponseDTO {
    public UUID id;
    public String name;
    public String description;

    public static FacultyResponseDTO fromEntity(Faculty faculty) {
        FacultyResponseDTO dto = new FacultyResponseDTO();
        dto.id = faculty.getId();
        dto.name = faculty.getName();
        dto.description = faculty.getDescription();
        return dto;
    }
}
