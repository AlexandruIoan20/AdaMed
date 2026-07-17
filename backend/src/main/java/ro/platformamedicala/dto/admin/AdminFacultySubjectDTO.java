package ro.platformamedicala.dto.admin;

import ro.platformamedicala.entities.FacultySubject;

import java.util.UUID;

public class AdminFacultySubjectDTO {
    public UUID facultySubjectId;
    public UUID subjectId;
    public String name;
    public String description;
    public Integer yearOfStudy;
    public Integer credits;
    public long questionCount;

    public static AdminFacultySubjectDTO of(FacultySubject fs, long questionCount) {
        AdminFacultySubjectDTO dto = new AdminFacultySubjectDTO();
        dto.facultySubjectId = fs.getId();
        dto.subjectId = fs.getSubject().getId();
        dto.name = fs.getSubject().getName();
        dto.description = fs.getSubject().getDescription();
        dto.yearOfStudy = fs.getYearOfStudy();
        dto.credits = fs.getCredits();
        dto.questionCount = questionCount;
        return dto;
    }
}
