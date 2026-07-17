package ro.platformamedicala.resource.admin;

import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import ro.platformamedicala.dto.admin.AdminUserDTO;
import ro.platformamedicala.dto.PageDTO;
import ro.platformamedicala.dto.admin.UpdateUserRequestDTO;
import ro.platformamedicala.service.admin.AdminUserService;

import java.util.UUID;

@Path("/api/admin/users")
@RolesAllowed("ADMIN")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AdminUserResource {

    private final AdminUserService adminUserService;

    public AdminUserResource(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GET
    public PageDTO<AdminUserDTO> list(@QueryParam("page") @DefaultValue("0") int page,
                                      @QueryParam("size") @DefaultValue("20") int size,
                                      @QueryParam("search") String search) {
        return adminUserService.list(page, size, search);
    }

    @PATCH
    @Path("/{id}")
    public AdminUserDTO update(@PathParam("id") UUID id, @Valid UpdateUserRequestDTO dto) {
        return adminUserService.updateUser(id, dto);
    }
}
