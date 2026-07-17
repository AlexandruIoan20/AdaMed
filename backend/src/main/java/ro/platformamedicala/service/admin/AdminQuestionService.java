package ro.platformamedicala.service.admin;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import ro.platformamedicala.dto.admin.AdminQuestionDTO;
import ro.platformamedicala.dto.admin.AnswerRequestDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.dto.admin.QuestionRequestDTO;
import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.FacultySubject;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.QuestionImage;
import ro.platformamedicala.entities.UserAnswer;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class AdminQuestionService {

    private final AdminCascadeService adminCascadeService;

    public AdminQuestionService(AdminCascadeService adminCascadeService) {
        this.adminCascadeService = adminCascadeService;
    }

    /**
     * Functie ce returneaza lista de intrebari specifice unei anumite materii (a unei facultati)
     * @param facultySubjectId materia facultatii
     * @param page numarul paginii
     * @param size numarul de intrebari listate pe pagina
     * @return Lista paginata cu intrebarile facultatii la materia specificata
     */
    public PageDTO<AdminQuestionDTO> listForFacultySubject(UUID facultySubjectId, int page, int size) {
        PanacheQuery<Question> query =
                Question.find("facultySubject.id", Sort.by("createdAt").and("id"), facultySubjectId);
        long total = query.count();
        List<AdminQuestionDTO> content = query.page(Page.of(page, size)).<Question>list().stream()
                .map(this::toDto)
                .toList();
        return PageDTO.of(content, page, size, total);
    }

    public AdminQuestionDTO get(UUID questionId) {
        return toDto(requireQuestion(questionId));
    }

    /**
     * Functie de creare a unei intrebari
     * - Se valideaza intrebarea
     * - Se creeaza entitatea OOP
     * - Se salveaza in baza de date
     * - Se creeaza entitate si se salveaza in baza de date pentru fiecare optiune de raspuns
     * @param facultySubjectId Materia facultatii pentru care se creeaza grila
     * @param dto requestul ce contine informatii despre grila
     * @return AdminQuestionDTO intrebarea nou creeata
     */
    @Transactional
    public AdminQuestionDTO create(UUID facultySubjectId, QuestionRequestDTO dto) {
        validate(dto);
        FacultySubject fs = FacultySubject.findById(facultySubjectId);
        if (fs == null) {
            throw AdminErrors.notFound("Legătura facultate-materie nu există.");
        }

        Question question = new Question();
        question.setFacultySubject(fs);
        question.setText(dto.text.trim());
        question.setExplanation(dto.explanation);
        question.setCreatedAt(LocalDateTime.now());
        question.persist();

        int position = 0;
        for (AnswerRequestDTO ar : dto.answers) {
            Answer answer = new Answer();
            answer.setQuestion(question);
            answer.setText(ar.text.trim());
            answer.setImageUrl(ar.imageUrl);
            answer.setIsCorrect(ar.isCorrect);
            answer.setPosition(position++);
            answer.persist();
        }

        return toDto(question);
    }

    /**
     * Functie de actualizare a unei grile
     * - Se valideaza datele
     * - Se creeaza un hash map <id-ul fiecarui raspuns, noul raspuns ce va avea acel id>
     * @param questionId ID-ul intrebarii pentru care se face actualizarea
     * @param dto Requestul cu datele ce urmeaza sa ajunga in baza de date
     * @return AdminQuestionDTO intrebarea actualizata
     */
    @Transactional
    public AdminQuestionDTO update(UUID questionId, QuestionRequestDTO dto) {
        validate(dto);
        Question question = requireQuestion(questionId);
        question.setText(dto.text.trim());
        question.setExplanation(dto.explanation);

        List<Answer> existing = Answer.list("question.id", questionId);
        Map<UUID, Answer> byId = new HashMap<>();
        for (Answer a : existing) {
            byId.put(a.getId(), a);
        }

        Set<UUID> incomingIds = new HashSet<>();
        for (AnswerRequestDTO ar : dto.answers) {
            if (ar.id != null) {
                incomingIds.add(ar.id);
            }
        }

        for (Answer a : existing) {
            if (!incomingIds.contains(a.getId())) {
                long refs = UserAnswer.count("selectedAnswer.id", a.getId());
                if (refs > 0) {
                    throw AdminErrors.conflict(
                            "Răspunsul „" + a.getText() + "” a fost deja folosit în istoricul utilizatorilor și nu poate fi șters.");
                }
                a.delete();
            }
        }

        int position = 0;
        for (AnswerRequestDTO ar : dto.answers) {
            Answer answer;
            if (ar.id != null) {
                answer = byId.get(ar.id);
                if (answer == null) {
                    throw AdminErrors.badRequest("Răspunsul cu id-ul " + ar.id + " nu aparține acestei grile.");
                }
            } else {
                answer = new Answer();
                answer.setQuestion(question);
            }
            answer.setText(ar.text.trim());
            answer.setImageUrl(ar.imageUrl);
            answer.setIsCorrect(ar.isCorrect);
            answer.setPosition(position++);
            if (ar.id == null) {
                answer.persist();
            }
        }

        return toDto(question);
    }

    @Transactional
    public void delete(UUID questionId) {
        requireQuestion(questionId);
        adminCascadeService.deleteQuestion(questionId);
    }

    private AdminQuestionDTO toDto(Question question) {
        List<Answer> answers = Answer.list("question.id = ?1 order by position", question.getId());
        List<QuestionImage> images = QuestionImage.list("question.id = ?1 order by displayOrder", question.getId());
        return AdminQuestionDTO.of(question, answers, images);
    }

    private Question requireQuestion(UUID id) {
        Question question = Question.findById(id);
        if (question == null) {
            throw AdminErrors.notFound("Grila nu există.");
        }
        return question;
    }

    private void validate(QuestionRequestDTO dto) {
        if (dto.answers == null || dto.answers.size() < 2) {
            throw AdminErrors.badRequest("Grila trebuie să aibă cel puțin 2 răspunsuri.");
        }
        boolean hasCorrect = dto.answers.stream().anyMatch(a -> Boolean.TRUE.equals(a.isCorrect));
        if (!hasCorrect) {
            throw AdminErrors.badRequest("Grila trebuie să aibă cel puțin un răspuns corect.");
        }
    }
}
