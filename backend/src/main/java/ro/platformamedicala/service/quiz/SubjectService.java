package ro.platformamedicala.service.quiz;

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
public class SubjectService {
    private final QuizAccessService accessService;
    private final SubjectRepository subjectRepository;

    public SubjectService(QuizAccessService accessService, SubjectRepository subjectRepository) {
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
            dto.totalQuestions = countQuestions(fs.getId());

            QuizSession activeLearning = subjectRepository.findActiveSession(user.getId(), fs.getId(), SessionMode.LEARNING);
            QuizSession activePractice = subjectRepository.findActiveSession(user.getId(), fs.getId(), SessionMode.PRACTICE);

            dto.learningActiveSessionId = activeLearning != null ? activeLearning.getId() : null;
            dto.practiceActiveSessionId = activePractice != null ? activePractice.getId() : null;

            dto.learningSolvedQuestions = subjectRepository.countSolvedQuestions(user.getId(), fs.getId(), SessionMode.LEARNING);
            dto.practiceSolvedQuestions = subjectRepository.countSolvedQuestions(user.getId(), fs.getId(), SessionMode.PRACTICE);

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
        dto.totalQuestions = countQuestions(fs.getId());

        QuizSession activeLearning = subjectRepository.findActiveSession(user.getId(), fs.getId(), SessionMode.LEARNING);
        QuizSession activePractice = subjectRepository.findActiveSession(user.getId(), fs.getId(), SessionMode.PRACTICE);

        dto.learningActiveSessionId = activeLearning != null ? activeLearning.getId() : null;
        dto.practiceActiveSessionId = activePractice != null ? activePractice.getId() : null;

        dto.learningSolvedQuestions = subjectRepository.countSolvedQuestions(user.getId(), fs.getId(), SessionMode.LEARNING);
        dto.practiceSolvedQuestions = subjectRepository.countSolvedQuestions(user.getId(), fs.getId(), SessionMode.PRACTICE);

        List<QuizSession> sessions = QuizSession.list(
                "user.id = ?1 and facultySubject.id = ?2 order by startedAt desc",
                user.getId(), fs.getId());
        dto.sessions = sessions.stream()
                .map(s -> SessionResultDTO.fromEntity(s, subjectRepository.countAnsweredQuestions(s.getId())))
                .toList();
        return dto;
    }

    long countQuestions(UUID facultySubjectId) {
        return Question.count("facultySubject.id", facultySubjectId);
    }
}
