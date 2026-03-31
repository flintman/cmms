package com.grash.controller;

import com.grash.dto.PartStockPatchDTO;
import com.grash.dto.PartStockShowDTO;
import com.grash.dto.PartStockTransferDTO;
import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.PartStock;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.RoleType;
import com.grash.service.PartStockService;
import com.grash.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Collection;
import java.util.Optional;

@RestController
@RequestMapping("/part-stocks")
@Tag(name = "part-stock")
@RequiredArgsConstructor
public class PartStockController {

    private final PartStockService partStockService;
    private final UserService userService;

    @GetMapping("/part/{partId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<PartStockShowDTO> getByPart(@PathVariable Long partId, HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.PARTS_AND_MULTIPARTS)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        return partStockService.findByPart(partId);
    }

    @GetMapping("/company")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<PartStockShowDTO> getByCompany(HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.PARTS_AND_MULTIPARTS)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        return partStockService.findByCompany(user.getCompany().getId());
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<PartStockShowDTO> create(@Valid @RequestBody PartStockPatchDTO dto,
                                                   HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.PARTS_AND_MULTIPARTS)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(partStockService.create(dto));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<PartStockShowDTO> update(@PathVariable Long id,
                                                   @Valid @RequestBody PartStockPatchDTO dto,
                                                   HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<PartStock> optional = partStockService.findById(id);
        if (optional.isEmpty()) throw new CustomException("Not found", HttpStatus.NOT_FOUND);
        PartStock stock = optional.get();
        if (!partStockService.isPartStockInCompany(stock, user.getCompany().getId())) {
            throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        }
        if (!user.getRole().getEditOtherPermissions().contains(PermissionEntity.PARTS_AND_MULTIPARTS)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(partStockService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> delete(@PathVariable Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<PartStock> optional = partStockService.findById(id);
        if (optional.isEmpty()) throw new CustomException("Not found", HttpStatus.NOT_FOUND);
        PartStock stock = optional.get();
        if (!partStockService.isPartStockInCompany(stock, user.getCompany().getId())) {
            throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        }
        if (!user.getRole().getDeleteOtherPermissions().contains(PermissionEntity.PARTS_AND_MULTIPARTS)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        partStockService.delete(id);
        return ResponseEntity.ok(new SuccessResponse(true, "Deleted successfully"));
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> transfer(@Valid @RequestBody PartStockTransferDTO dto,
                                                    HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getEditOtherPermissions().contains(PermissionEntity.PARTS_AND_MULTIPARTS)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        partStockService.transfer(dto);
        return ResponseEntity.ok(new SuccessResponse(true, "Transfer completed"));
    }
}
