package ro.platformamedicala.service.admin;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import ro.platformamedicala.dto.admin.AdminFacultyDTO;
import ro.platformamedicala.dto.admin.AdminFacultyDetailDTO;
import ro.platformamedicala.dto.admin.FacultyRequestDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.entities.Faculty;
import ro.platformamedicala.entities.FacultySubject;
import ro.platformamedicala.entities.User;

import java.util.List;
import java.util.UUID;

/**
 * Service ce se ocupa cu operatii CRUD pentru facultati
 */
@ApplicationScoped
public class AdminFacultyService {
    private final AdminCascadeService cascadeService;

    public AdminFacultyService(AdminCascadeService cascadeService) {
        this.cascadeService = cascadeService;
    }

    /**
     *  Listarea tuturor facultatilor in panelul de admin
     *
     * @param page numarul paginii
     * @param size numarul de elemente de pe o pagina
     * @param search paramterii de cautare
     * @return Lista cu toate facultatile gasite in functie de parametri
     */
    public PageDTO<AdminFacultyDTO> list(int page, int size, String search) {
        PanacheQuery<Faculty> query;
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            query = Faculty.find("lower(name) like ?1", Sort.by("name"), pattern);
        } else {
            query = Faculty.findAll(Sort.by("name"));
        }

        long total = query.count();
        List<AdminFacultyDTO> content = query.page(Page.of(page, size)).<Faculty>list().stream()
                .map(this::toDto)
                .toList();
        return PageDTO.of(content, page, size, total);
    }

    /**
     * Functia cauta o facultate dupa un ID
     * @param id ID-ul facultatii cautate
     * @return Detaliile facultatii cautate
     */
    public AdminFacultyDetailDTO get(UUID id) {
        Faculty faculty = requireFaculty(id);
        return AdminFacultyDetailDTO.of(faculty,
                FacultySubject.count("faculty.id", id),
                User.count("faculty.id", id));
    }

    /**
     * Functie de tip CREATE pentru Faculty din baza de date
     * @param dto Datele necesare pentru creearea noii facultati
     * @return AdminFacultyDTO
     */
    @Transactional
    public AdminFacultyDTO create(FacultyRequestDTO dto) {
        requireUniqueName(dto.name, null);
        Faculty faculty = new Faculty();
        faculty.setName(dto.name.trim());
        faculty.setDescription(dto.description);
        faculty.persist();
        return toDto(faculty);
    }

    /**
     * Functie de tip UPDATE pentru Faculty din baza de date
     * @param id ID-ul facultatii de actualizat
     * @param dto obiectul cu proprietatile pentru actualizarea facultatii
     * @return AdminFacultyDTO
     */
    @Transactional
    public AdminFacultyDTO update(UUID id, FacultyRequestDTO dto) {
        Faculty faculty = requireFaculty(id);
        requireUniqueName(dto.name, id);
        faculty.setName(dto.name.trim());
        faculty.setDescription(dto.description);
        return toDto(faculty);
    }

    /**
     * Functie pentru stergerea unei facultati din baza de date
     *  - Daca exista utilizatori ce au referinta la facultate, aceasta nu poate fi stearsa
     *  - Pentru fiecare materie a facultatii se executa logica din adminCascadeService.detachFacultySubject(...)
     *  - Se sterge facultatea
     * @param id Id-ul facultatii ce trebuie sters
     */
    @Transactional
    public void delete(UUID id) {
        Faculty faculty = requireFaculty(id);

        long userCount = User.count("faculty.id", id);
        if (userCount > 0) {
            throw AdminErrors.conflict(
                    "Facultatea are " + userCount + " utilizatori asociați și nu poate fi ștearsă.");
        }

        List<FacultySubject> links = FacultySubject.list("faculty.id", id);
        for (FacultySubject link : links) {
            cascadeService.detachFacultySubject(link);
        }
        faculty.delete();
    }

    private AdminFacultyDTO toDto(Faculty faculty) {
        return AdminFacultyDTO.of(faculty,
                FacultySubject.count("faculty.id", faculty.getId()),
                User.count("faculty.id", faculty.getId()));
    }

    /**
     *  Se cauta daca exista facultatea in baza de date
     * @param id ID-ul facultatii ce trebuie cautat
     * @return Facultatea | AdminErrors.notFound Exception
     */
    private Faculty requireFaculty(UUID id) {
        Faculty faculty = Faculty.findById(id);
        if (faculty == null) {
            throw AdminErrors.notFound("Facultatea nu există.");
        }
        return faculty;
    }

    /**
     * Functie helper pentru a verfica unicitatea pe campul username din baza de date
     * @param name Numele pentru care se face verificarea
     * @param excludeId Contul curent pentru care se face schimbarea de nume de catre admin
     */
    private void requireUniqueName(String name, UUID excludeId) {
        long clash = excludeId == null
                ? Faculty.count("lower(name) = ?1", name.trim().toLowerCase())
                : Faculty.count("lower(name) = ?1 and id <> ?2", name.trim().toLowerCase(), excludeId);
        if (clash > 0) {
            throw AdminErrors.conflict("Numele facultății există deja.");
        }
    }
}
