package ro.platformamedicala.repository.admin;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import ro.platformamedicala.entities.FacultySubject;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.QuestionImage;
import ro.platformamedicala.entities.UserAnswer;

import java.util.List;
import java.util.UUID;

/**
 * Repository ce se ocupa de stergerea sistematica a obiectelor din baza de date
 * - Se foloseste doar de userii cu permisiune de ADMIN
 */
@ApplicationScoped
public class AdminCascadeRepository {
    @Inject
    EntityManager em;

    public Question findQuestionById(UUID questionId) {
        return Question.findById(questionId);
    }

    public List<QuestionImage> findImagesByQuestionId(UUID questionId) {
        return QuestionImage.list("question.id", questionId);
    }

    public void deleteUserAnswersByQuestionId(UUID questionId) {
        UserAnswer.delete("question.id", questionId);
    }

    public void deleteQuestionBookmarks(UUID questionId) {
        em.createNativeQuery("DELETE FROM user_question_bookmarks WHERE question_id = ?1")
                .setParameter(1, questionId)
                .executeUpdate();
    }

    public void deleteAiExplanations(UUID questionId) {
        em.createNativeQuery("DELETE FROM ai_explanations WHERE question_id = ?1")
                .setParameter(1, questionId)
                .executeUpdate();
    }

    public void deleteQuestion(Question question) {
        question.delete();
    }

    public List<Question> findQuestionsByFacultySubjectId(UUID fsId) {
        return Question.list("facultySubject.id", fsId);
    }

    public void detachQuizSessionsFromFacultySubject(UUID fsId) {
        em.createNativeQuery("UPDATE quiz_sessions SET faculty_subject_id = NULL WHERE faculty_subject_id = ?1")
                .setParameter(1, fsId)
                .executeUpdate();
    }

    public void deleteFacultySubject(FacultySubject facultySubject) {
        facultySubject.delete();
    }
}