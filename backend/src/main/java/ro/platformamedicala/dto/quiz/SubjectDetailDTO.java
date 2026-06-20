package ro.platformamedicala.dto.quiz;

import java.util.List;
import java.util.UUID;

public class SubjectDetailDTO {
    public UUID subjectId;
    public String name;
    public String description;
    public Integer yearOfStudy;
    public Integer credits;
    public long totalQuestions;
    public long solvedQuestions;
    public boolean hasActiveSession;
    public UUID activeSessionId;

    // Sesiunile userului pe aceasta materie (recente intai).
    public List<SessionResultDTO> sessions;
}
