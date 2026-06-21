package ro.platformamedicala.dto.quiz;

import java.util.UUID;

public class SubjectListItemDTO {
    public UUID subjectId;
    public String name;
    public String description;
    public Integer yearOfStudy;
    public Integer credits;
    public long totalQuestions;
    public long learningSolvedQuestions;
    public long practiceSolvedQuestions;
    public UUID learningActiveSessionId;
    public UUID practiceActiveSessionId;
}
