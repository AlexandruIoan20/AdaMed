package ro.platformamedicala.service.admin;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import ro.platformamedicala.dto.admin.AdminFacultySubjectDTO;
import ro.platformamedicala.dto.admin.AdminSubjectDTO;
import ro.platformamedicala.dto.admin.AttachSubjectRequestDTO;
import ro.platformamedicala.dto.admin.FacultySubjectRequestDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.dto.admin.SubjectRequestDTO;
import ro.platformamedicala.entities.Faculty;
import ro.platformamedicala.entities.FacultySubject;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.Subject;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AdminSubjectService {

    private final AdminCascadeService cascadeService;

    public AdminSubjectService(AdminCascadeService cascadeService) {
        this.cascadeService = cascadeService;
    }


    /**
     * Functie pentru listarea tuturor materiilor de pe platforma
     * @param page Numarul paginii
     * @param size Numarul de obiecte de pe pagina
     * @param search Parametrii de cautare
     * @return Lista cu toate materiile gasite
     */
    public PageDTO<AdminSubjectDTO> list(int page, int size, String search) {
        PanacheQuery<Subject> query;
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            query = Subject.find("lower(name) like ?1", Sort.by("name"), pattern);
        } else {
            query = Subject.findAll(Sort.by("name"));
        }

        long total = query.count();
        List<AdminSubjectDTO> content = query.page(Page.of(page, size)).<Subject>list().stream()
                .map(s -> AdminSubjectDTO.of(s, FacultySubject.count("subject.id", s.getId())))
                .toList();
        return PageDTO.of(content, page, size, total);
    }

    /**
     * Functie CREATE pentru Subject din baza de date
     * @param dto Proprietatile obiectului nou
     * @return AdminSubjectDTO Noua materie creeata
     */
    @Transactional
    public AdminSubjectDTO create(SubjectRequestDTO dto) {
        requireUniqueName(dto.name, null);
        Subject subject = new Subject();
        subject.setName(dto.name.trim());
        subject.setDescription(dto.description);
        subject.persist();
        return AdminSubjectDTO.of(subject, 0);
    }

    /**
     * Functie UPDATE pentru Subject din baza de date
     * @param id ID-ul materieie actualizate
     * @param dto Proprietatile pentru actualizarea materiei
     * @return AdminSubjectDTO Materia actualizata
     */
    @Transactional
    public AdminSubjectDTO update(UUID id, SubjectRequestDTO dto) {
        Subject subject = requireSubject(id);
        requireUniqueName(dto.name, id);
        subject.setName(dto.name.trim());
        subject.setDescription(dto.description);
        return AdminSubjectDTO.of(subject, FacultySubject.count("subject.id", id));
    }

    // Cascadă completă: dezleagă materia de toate facultățile (ștergând grilele fiecăreia),
    // apoi șterge materia din catalog (vezi §2.5).

    /**
     * Functie pentru stergerea unei materii din baza de date.
     *   - Se sterg toate legaturile dintre materia respectiva si facultati (inclusiv grilele acesteia)
     *   - Se sterge materia din baza de date.
     * @param id ID-ul materiei pentru care se apeleaza stergerea
     */
    @Transactional
    public void delete(UUID id) {
        Subject subject = requireSubject(id);
        List<FacultySubject> links = FacultySubject.list("subject.id", id);
        for (FacultySubject link : links) {
            cascadeService.detachFacultySubject(link);
        }
        subject.delete();
    }


    /**
     * Functie pentru listarea tuturor materiilor unei facultati
     * @param facultyId ID-ul facultatii pentru care se face listarea
     * @param page Numarul paginii
     * @param size Numarul de obiecte de pe pagina
     * @return Lista cu toate materiile gasite.
     */
    public PageDTO<AdminFacultySubjectDTO> listForFaculty(UUID facultyId, int page, int size) {
        PanacheQuery<FacultySubject> query = FacultySubject.find("faculty.id", Sort.by("subject.name"), facultyId);
        long total = query.count();
        List<AdminFacultySubjectDTO> content = query.page(Page.of(page, size)).<FacultySubject>list().stream()
                .map(fs -> AdminFacultySubjectDTO.of(fs, Question.count("facultySubject.id", fs.getId())))
                .toList();
        return PageDTO.of(content, page, size, total);
    }

    /**
     * Functie pentru creearea unei legaturi dintre materie si facultate
     * @param facultyId ID-ul facultatii pentru care se face legatura
     * @param dto Informatiile necesare cu privire la creearea legaturii (id-ul materiei, anul de studiu si creditele materiei)
     * @return AdminFacultySubjectDTO Obiectul nou creeat (legatura)
     */
    @Transactional
    public AdminFacultySubjectDTO attachToFaculty(UUID facultyId, AttachSubjectRequestDTO dto) {
        Faculty faculty = Faculty.findById(facultyId);
        if (faculty == null) {
            throw AdminErrors.notFound("Facultatea nu există.");
        }

        Subject subject;
        if (dto.subjectId != null) {
            subject = requireSubject(dto.subjectId);
        } else if (dto.newSubject != null) {
            requireUniqueName(dto.newSubject.name, null);
            subject = new Subject();
            subject.setName(dto.newSubject.name.trim());
            subject.setDescription(dto.newSubject.description);
            subject.persist();
        } else {
            throw AdminErrors.badRequest("Trebuie să alegi o materie existentă (subjectId) sau să creezi una nouă (newSubject).");
        }

        if (FacultySubject.count("faculty.id = ?1 and subject.id = ?2", facultyId, subject.getId()) > 0) {
            throw AdminErrors.conflict("Materia este deja legată de această facultate.");
        }

        FacultySubject fs = new FacultySubject();
        fs.setFaculty(faculty);
        fs.setSubject(subject);
        fs.setYearOfStudy(dto.yearOfStudy);
        fs.setCredits(dto.credits);
        fs.persist();
        return AdminFacultySubjectDTO.of(fs, 0);
    }

    /**
     * Functie pentru actualizrea legaturii dintre materie si facultate (se actualizeaza creditele / anul de studiu)
     * @param facultySubjectId ID-ul legaturii
     * @param dto Informatiile necesare pentru actualizare
     * @return Obiectul legatura actualizat
     */
    @Transactional
    public AdminFacultySubjectDTO updateLink(UUID facultySubjectId, FacultySubjectRequestDTO dto) {
        FacultySubject fs = requireLink(facultySubjectId);
        fs.setYearOfStudy(dto.yearOfStudy);
        fs.setCredits(dto.credits);
        return AdminFacultySubjectDTO.of(fs, Question.count("facultySubject.id", facultySubjectId));
    }

    /**
     * Functie ce apeleaza logica de tip cascada pentru a elimina legatura dintre o materie si o facultate
     * (vezi in AdminCascadeService functia detachFacultySubject)
     * @param facultySubjectId ID-ul legaturii ce trebuie stearsa
     */
    @Transactional
    public void detach(UUID facultySubjectId) {
        FacultySubject fs = requireLink(facultySubjectId);
        cascadeService.detachFacultySubject(fs);
    }

    /**
     * GET pentru informatiile legaturii dintre o materie si o facultate
     * @param facultySubjectId ID-ul legaturii
     * @return AdminFacultySubjectDTO
     */
    public AdminFacultySubjectDTO getLink(UUID facultySubjectId) {
        FacultySubject fs = requireLink(facultySubjectId);
        return AdminFacultySubjectDTO.of(fs, Question.count("facultySubject.id", facultySubjectId));
    }

    private Subject requireSubject(UUID id) {
        Subject subject = Subject.findById(id);
        if (subject == null) {
            throw AdminErrors.notFound("Materia nu există.");
        }
        return subject;
    }

    private FacultySubject requireLink(UUID id) {
        FacultySubject fs = FacultySubject.findById(id);
        if (fs == null) {
            throw AdminErrors.notFound("Legătura facultate-materie nu există.");
        }
        return fs;
    }

    private void requireUniqueName(String name, UUID excludeId) {
        long clash = excludeId == null
                ? Subject.count("lower(name) = ?1", name.trim().toLowerCase())
                : Subject.count("lower(name) = ?1 and id <> ?2", name.trim().toLowerCase(), excludeId);
        if (clash > 0) {
            throw AdminErrors.conflict("Numele materiei există deja.");
        }
    }
}
