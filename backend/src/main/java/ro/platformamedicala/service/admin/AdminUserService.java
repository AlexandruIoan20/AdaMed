package ro.platformamedicala.service.admin;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import ro.platformamedicala.dto.admin.AdminUserDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.dto.admin.UpdateUserRequestDTO;
import ro.platformamedicala.entities.User;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AdminUserService {
    /**
     * Functie pentru listarea utilizatorilor de pe platforma
     * @param page Numarul paginii
     * @param size Numarul de obiecte de pe pagina
     * @param search Parametrii de cautare
     * @return Lista cu utilizatorii gasiti
     */
    public PageDTO<AdminUserDTO> list(int page, int size, String search) {
        PanacheQuery<User> query;
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            query = User.find("lower(username) like ?1 or lower(email) like ?1", Sort.by("username"), pattern);
        } else {
            query = User.findAll(Sort.by("username"));
        }

        long total = query.count();
        List<AdminUserDTO> content = query.page(Page.of(page, size)).list().stream()
                .map(u -> AdminUserDTO.fromEntity((User) u))
                .toList();
        return PageDTO.of(content, page, size, total);
    }

    /**
     * Functie de tip UPDATE pentru actualizrea informatiilor unui
     *      - Se pot schimba doar rolurile si username-ul
     * @param id ID-ul utilizatorului pentru care trebuiesc schimbate informatii
     * @param dto Informatiile pentru actualizare
     * @return
     */
    @Transactional
    public AdminUserDTO updateUser(UUID id, UpdateUserRequestDTO dto) {
        User user = User.findById(id);
        if (user == null) {
            throw AdminErrors.notFound("Utilizatorul nu există.");
        }

        long clash = User.count("lower(username) = ?1 and id <> ?2", dto.username.trim().toLowerCase(), id);
        if (clash > 0) {
            throw AdminErrors.conflict("Există deja un utilizator cu acest username.");
        }

        user.setUsername(dto.username.trim());
        user.setRole(dto.role);
        return AdminUserDTO.fromEntity(user);
    }
}
