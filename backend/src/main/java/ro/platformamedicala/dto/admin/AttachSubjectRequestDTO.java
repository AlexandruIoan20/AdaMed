package ro.platformamedicala.dto.admin;

import jakarta.validation.Valid;

import java.util.UUID;

public class AttachSubjectRequestDTO {
    public UUID subjectId;

    @Valid
    public SubjectRequestDTO newSubject;

    public Integer yearOfStudy;
    public Integer credits;
}
