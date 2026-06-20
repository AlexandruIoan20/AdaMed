package service.quiz;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ForbiddenException;
import ro.platformamedicala.entities.FacultySubject;
import ro.platformamedicala.entities.User;

import java.util.UUID;

@ApplicationScoped
public class QuizAccessService {
    public FacultySubject requireAccess(User user, UUID subjectId) {
        return FacultySubject.<FacultySubject>find(
                        "faculty.id = ?1 and subject.id = ?2", user.getFaculty().getId(), subjectId)
                .firstResultOptional()
                .orElseThrow(() -> new ForbiddenException("Materia nu aparține facultății tale."));
    }
}
