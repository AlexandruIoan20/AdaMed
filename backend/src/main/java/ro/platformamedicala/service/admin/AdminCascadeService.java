package ro.platformamedicala.service.admin;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import ro.platformamedicala.entities.FacultySubject;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.QuestionImage;
import ro.platformamedicala.repository.admin.AdminCascadeRepository;
import ro.platformamedicala.service.R2StorageService;

import java.util.List;
import java.util.UUID;

/**
 * Serviciu de stergere a obiectelor (fiecare in cascada dupa logica sa)
 */
@ApplicationScoped
public class AdminCascadeService {
    private final R2StorageService r2StorageService;
    private final AdminCascadeRepository adminCascadeRepository;

    @Inject
    public AdminCascadeService(R2StorageService r2StorageService, AdminCascadeRepository adminCascadeRepository) {
        this.r2StorageService = r2StorageService;
        this.adminCascadeRepository = adminCascadeRepository;
    }

    /**
     * Functie ce sterge o grila dupa urmatorii pasi:
     * - Sterge fisierele din bucketul R2
     * - Sterge raspunsurile date de utilizatori la grila
     * - Sterge intrebarea de la "Saved" pentru orice utilizator
     * - Sterge orice explicatie AI din baza de date.
     *
     *   (optiunile de raspuns din tabela answers se sterg automat din baza de date)
     * * @param questionId UUID-ul grilei
     */
    public void deleteQuestion(UUID questionId) {
        Question question = adminCascadeRepository.findQuestionById(questionId);
        if (question == null) {
            return;
        }

        List<QuestionImage> images = adminCascadeRepository.findImagesByQuestionId(questionId);
        for (QuestionImage image : images) {
            r2StorageService.delete(image.imageKey);
        }


        adminCascadeRepository.deleteUserAnswersByQuestionId(questionId);
        adminCascadeRepository.deleteQuestionBookmarks(questionId);
        adminCascadeRepository.deleteAiExplanations(questionId);

        adminCascadeRepository.deleteQuestion(question);
    }

    /**
     * Dezlegare materie de facultate: șterge grilele acestei perechi (cu R2 + dependențe),
     * dezleagă sesiunile, apoi șterge legătura.
     *
     * - Aplica logica deleteQuestion(questionId) pe fiecare grila existenta
     * - Sterge referinta dintre materie si sesiunile de quiz desfasurate
     * - Sterge referinta dintre materie si adaptarea ei la facultate
     *
     * @param facultySubject materia ce urmeaza sa fie stearsa (referinta de la facultatea ce sterge materia)
     */
    public void detachFacultySubject(FacultySubject facultySubject) {
        UUID fsId = facultySubject.getId();

        List<Question> questions = adminCascadeRepository.findQuestionsByFacultySubjectId(fsId);
        for (Question question : questions) {
            deleteQuestion(question.getId());
        }

        adminCascadeRepository.detachQuizSessionsFromFacultySubject(fsId);
        adminCascadeRepository.deleteFacultySubject(facultySubject);
    }
}