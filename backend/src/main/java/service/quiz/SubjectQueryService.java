package service.quiz;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import ro.platformamedicala.dto.quiz.SessionResultDTO;
import ro.platformamedicala.dto.quiz.SubjectDetailDTO;
import ro.platformamedicala.dto.quiz.SubjectListItemDTO;
import ro.platformamedicala.entities.*;
import ro.platformamedicala.repository.SubjectRepository;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class SubjectQueryService {
    private final QuizAccessService accessService;
    private final SubjectRepository subjectRepository;

    public SubjectQueryService(QuizAccessService accessService, SubjectRepository subjectRepository) {
        this.accessService = accessService;
        this.subjectRepository = subjectRepository;
    }

    @Transactional
    public List<SubjectListItemDTO> listForUser(User user) {
        List<FacultySubject> facultySubjects =
                FacultySubject.list("faculty.id", user.getFaculty().getId());

        return facultySubjects.stream().map(fs -> {
            Subject subject = fs.getSubject();
            SubjectListItemDTO dto = new SubjectListItemDTO();
            dto.subjectId = subject.getId();
            dto.name = subject.getName();
            dto.description = subject.getDescription();
            dto.yearOfStudy = fs.getYearOfStudy();
            dto.credits = fs.getCredits();
            dto.totalQuestions = countQuestions(subject.getId());
            dto.solvedQuestions = subjectRepository.countSolvedQuestions(user.getId(), subject.getId());
            QuizSession active = findActiveSession(user.getId(), subject.getId());
            dto.hasActiveSession = active != null;
            dto.activeSessionId = active != null ? active.getId() : null;
            return dto;
        }).toList();
    }

    @Transactional
    public SubjectDetailDTO getDetail(User user, UUID subjectId) {
        FacultySubject fs = accessService.requireAccess(user, subjectId);
        Subject subject = fs.getSubject();

        SubjectDetailDTO dto = new SubjectDetailDTO();
        dto.subjectId = subject.getId();
        dto.name = subject.getName();
        dto.description = subject.getDescription();
        dto.yearOfStudy = fs.getYearOfStudy();
        dto.credits = fs.getCredits();
        dto.totalQuestions = countQuestions(subjectId);
        dto.solvedQuestions = subjectRepository.countSolvedQuestions(user.getId(), subjectId);

        QuizSession active = findActiveSession(user.getId(), subjectId);
        dto.hasActiveSession = active != null;
        dto.activeSessionId = active != null ? active.getId() : null;

        List<QuizSession> sessions = QuizSession.list(
                "user.id = ?1 and subject.id = ?2 order by startedAt desc",
                user.getId(), subjectId);
        dto.sessions = sessions.stream()
                .map(s -> SessionResultDTO.fromEntity(s, subjectRepository.countAnsweredQuestions(s.getId())))
                .toList();
        return dto;
    }

    long countQuestions(UUID subjectId) {
        return Question.count("subject.id", subjectId);
    }

    QuizSession findActiveSession(UUID userId, UUID subjectId) {
        return QuizSession.<QuizSession>find(
                        "user.id = ?1 and subject.id = ?2 and status = ?3",
                        userId, subjectId, SessionStatus.ACTIVE)
                .firstResult();
    }
}
