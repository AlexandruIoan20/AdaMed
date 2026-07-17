package ro.platformamedicala.service.quiz;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import ro.platformamedicala.dto.quiz.AnswerResultDTO;
import ro.platformamedicala.dto.quiz.QuestionDTO;
import ro.platformamedicala.dto.quiz.SessionResultDTO;
import ro.platformamedicala.dto.quiz.SubmitAnswerRequestDTO;
import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.FacultySubject;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.QuestionImage;
import ro.platformamedicala.entities.QuizSession;
import ro.platformamedicala.entities.SessionMode;
import ro.platformamedicala.entities.SessionStatus;
import ro.platformamedicala.entities.User;
import ro.platformamedicala.entities.UserAnswer;
import ro.platformamedicala.repository.UserAnswerRepository;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class QuizSessionService {
    private final QuizAccessService accessService;
    private final UserAnswerRepository userAnswerRepository;
    private final QuestionOptionsService questionOptionsService;

    public QuizSessionService(QuizAccessService accessService,
                              UserAnswerRepository userAnswerRepository,
                              QuestionOptionsService questionOptionsService) {
        this.accessService = accessService;
        this.userAnswerRepository = userAnswerRepository;
        this.questionOptionsService = questionOptionsService;
    }

    @Inject
    EntityManager em;

    @Transactional
    public SessionResultDTO startSession(User user, UUID subjectId, SessionMode mode) {
        FacultySubject facultySubject = accessService.requireAccess(user, subjectId);

        SessionMode effectiveMode = mode == null ? SessionMode.LEARNING : mode;

        QuizSession existing = QuizSession.<QuizSession>find(
                        "user.id = ?1 and facultySubject.id = ?2 and status = ?3 and mode = ?4",
                        user.getId(), facultySubject.getId(), SessionStatus.ACTIVE, effectiveMode)
                .firstResult();

        if (existing != null) {
            return SessionResultDTO.fromEntity(existing, userAnswerRepository.countAnsweredQuestions(existing.getId()));
        }

        QuizSession session = new QuizSession();
        session.setUser(user);
        session.setFacultySubject(facultySubject);
        session.setStatus(SessionStatus.ACTIVE);
        session.setMode(effectiveMode);
        session.setTotalQuestions((int) countQuestions(facultySubject.getId()));
        session.setCorrectAnswers(0);
        session.setStartedAt(LocalDateTime.now());
        session.persist();

        return SessionResultDTO.fromEntity(session, 0);
    }

    @Transactional
    public QuestionDTO getNextQuestion(User user, UUID sessionId) {
        Log.info("ESTE APELAT GET NEXT QUESTIONS");
        QuizSession session = loadOwnedSession(user, sessionId);
        if (session.getStatus() != SessionStatus.ACTIVE) {
            return null;
        }

        Set<UUID> answered = userAnswerRepository.answeredQuestionIds(sessionId);

        List<Question> questions = Question.list(
                "facultySubject.id = ?1 order by createdAt asc, id asc",
                session.getFacultySubject().getId());

        Question next = questions.stream()
                .filter(q -> !answered.contains(q.getId()))
                .findFirst()
                .orElse(null);

        if (next == null) {
            return null;
        }

        List<Answer> answers = Answer.list("question.id", next.getId());
        List<Answer> options = questionOptionsService.optionsFor(sessionId, next.getId(), session.getMode(), answers);

        List<QuestionImage> images = QuestionImage.list("question.id = ?1 order by displayOrder", next.getId());

        Log.infof("getNextQuestion: mode=%s grila=%s optiuni=%d imagini=%d%n%s",
                session.getMode(), next.getId(), options.size(), images.size(), options);

        return QuestionDTO.fromEntity(next, options, images);
    }

    @Transactional
    public AnswerResultDTO submitAnswer(User user, UUID sessionId, SubmitAnswerRequestDTO request) {
        QuizSession session = loadOwnedSession(user, sessionId);
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new BadRequestException("Sesiunea nu mai este activă.");
        }

        Question question = Question.findById(request.questionId);
        if (question == null || !question.getFacultySubject().getId().equals(session.getFacultySubject().getId())) {
            throw new BadRequestException("Grila nu aparține materiei acestei sesiuni.");
        }

        long already = UserAnswer.count("session.id = ?1 and question.id = ?2", sessionId, question.getId());
        if (already > 0) {
            throw new BadRequestException("Grila a fost deja rezolvată în această sesiune.");
        }

        List<Answer> answers = Answer.list("question.id", question.getId());
        List<Answer> options = questionOptionsService.optionsFor(sessionId, request.questionId, session.getMode(), answers);

        Set<UUID> correctIds = new HashSet<>();
        Set<UUID> validIds = new HashSet<>();
        for (Answer a : options) {
            validIds.add(a.getId());
            if (Boolean.TRUE.equals(a.getIsCorrect())) {
                correctIds.add(a.getId());
            }
        }

        Set<UUID> selectedIds = new HashSet<>(request.selectedAnswerIds == null ? List.of() : request.selectedAnswerIds);
        for (UUID selectedId : selectedIds) {
            if (!validIds.contains(selectedId)) {
                throw new BadRequestException("Răspuns invalid pentru această grilă.");
            }
        }

        LocalDateTime now = LocalDateTime.now();
        if (selectedIds.isEmpty()) {
            UserAnswer ua = new UserAnswer();
            ua.setQuizSession(session);
            ua.setUser(user);
            ua.setQuestion(question);
            ua.setSelectedAnswer(null);
            ua.setIsCorrect(false);
            ua.setAnsweredAt(now);
            ua.persist();
        } else {
            for (UUID selectedId : selectedIds) {
                UserAnswer ua = new UserAnswer();
                ua.setQuizSession(session);
                ua.setUser(user);
                ua.setQuestion(question);
                ua.setSelectedAnswer(em.getReference(Answer.class, selectedId));
                ua.setIsCorrect(correctIds.contains(selectedId));
                ua.setAnsweredAt(now);
                ua.persist();
            }
        }

        boolean wasCorrect = selectedIds.equals(correctIds);
        if (wasCorrect) {
            session.setCorrectAnswers((session.getCorrectAnswers() == null ? 0 : session.getCorrectAnswers()) + 1);
        }

        return new AnswerResultDTO(
                question.getId(),
                List.copyOf(correctIds),
                List.copyOf(selectedIds),
                wasCorrect,
                question.getExplanation());
    }

    @Transactional
    public SessionResultDTO finishSession(User user, UUID sessionId) {
        QuizSession session = loadOwnedSession(user, sessionId);
        if (session.getStatus() == SessionStatus.ACTIVE) {
            session.setStatus(SessionStatus.FINISHED);
            session.setFinishedAt(LocalDateTime.now());
        }
        return SessionResultDTO.fromEntity(session, userAnswerRepository.countAnsweredQuestions(sessionId));
    }

    @Transactional
    public SessionResultDTO getSession(User user, UUID sessionId) {
        QuizSession session = loadOwnedSession(user, sessionId);
        return SessionResultDTO.fromEntity(session, userAnswerRepository.countAnsweredQuestions(sessionId));
    }

    private QuizSession loadOwnedSession(User user, UUID sessionId) {
        QuizSession session = QuizSession.findById(sessionId);
        if (session == null) {
            throw new NotFoundException("Sesiunea nu există.");
        }
        if (!session.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("Sesiunea nu îți aparține.");
        }
        return session;
    }

    private long countQuestions(UUID facultySubjectId) {
        return Question.count("facultySubject.id", facultySubjectId);
    }
}
