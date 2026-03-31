package com.grash.service;

import com.grash.dto.LocationMiniDTO;
import com.grash.dto.PartStockPatchDTO;
import com.grash.dto.PartStockShowDTO;
import com.grash.dto.PartStockTransferDTO;
import com.grash.exception.CustomException;
import com.grash.model.Location;
import com.grash.model.Part;
import com.grash.model.PartStock;
import com.grash.repository.PartStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.Collection;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PartStockService {

    private final PartStockRepository partStockRepository;
    private final PartService partService;
    private final LocationService locationService;
    private final EntityManager em;

    @Transactional
    public PartStockShowDTO create(PartStockPatchDTO dto) {
        // Prevent duplicate location entry for same part
        partStockRepository.findByPart_IdAndLocation_Id(dto.getPartId(), dto.getLocationId())
                .ifPresent(existing -> {
                    throw new CustomException(
                            "A stock entry for this part at this location already exists", HttpStatus.CONFLICT);
                });

        PartStock stock = new PartStock();
        stock.setPart(em.getReference(Part.class, dto.getPartId()));
        stock.setLocation(em.getReference(Location.class, dto.getLocationId()));
        stock.setQuantity(dto.getQuantity());
        stock.setMinQuantity(dto.getMinQuantity());
        return toDTO(partStockRepository.saveAndFlush(stock));
    }

    @Transactional
    public PartStockShowDTO update(Long id, PartStockPatchDTO dto) {
        PartStock stock = partStockRepository.findById(id)
                .orElseThrow(() -> new CustomException("PartStock not found", HttpStatus.NOT_FOUND));
        stock.setQuantity(dto.getQuantity());
        stock.setMinQuantity(dto.getMinQuantity());
        // Allow moving to a different location if needed
        if (dto.getLocationId() != null) {
            stock.setLocation(em.getReference(Location.class, dto.getLocationId()));
        }
        return toDTO(partStockRepository.saveAndFlush(stock));
    }

    @Transactional
    public void transfer(PartStockTransferDTO dto) {
        double qty = dto.getQuantity();

        // Resolve source
        if ("shop".equals(dto.getFromType())) {
            Part part = partService.findById(dto.getFromId())
                    .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
            if (part.getQuantity() < qty)
                throw new CustomException("Not enough stock in shop", HttpStatus.NOT_ACCEPTABLE);
            part.setQuantity(part.getQuantity() - qty);
            partService.save(part);
        } else {
            PartStock from = partStockRepository.findById(dto.getFromId())
                    .orElseThrow(() -> new CustomException("Source stock not found", HttpStatus.NOT_FOUND));
            if (from.getQuantity() < qty)
                throw new CustomException("Not enough stock at source location", HttpStatus.NOT_ACCEPTABLE);
            from.setQuantity(from.getQuantity() - qty);
            partStockRepository.save(from);
        }

        // Resolve destination
        if ("shop".equals(dto.getToType())) {
            Part part = partService.findById(dto.getToId())
                    .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
            part.setQuantity(part.getQuantity() + qty);
            partService.save(part);
        } else {
            PartStock to = partStockRepository.findById(dto.getToId())
                    .orElseThrow(() -> new CustomException("Destination stock not found", HttpStatus.NOT_FOUND));
            to.setQuantity(to.getQuantity() + qty);
            partStockRepository.save(to);
        }
    }

    public void delete(Long id) {
        partStockRepository.deleteById(id);
    }

    public Optional<PartStock> findById(Long id) {
        return partStockRepository.findById(id);
    }

    public Collection<PartStockShowDTO> findByPart(Long partId) {
        return partStockRepository.findByPart_Id(partId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public Collection<PartStockShowDTO> findByCompany(Long companyId) {
        return partStockRepository.findByCompany_Id(companyId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public boolean isPartStockInCompany(PartStock stock, long companyId) {
        return stock.getCompany().getId().equals(companyId);
    }

    private PartStockShowDTO toDTO(PartStock stock) {
        PartStockShowDTO dto = new PartStockShowDTO();
        dto.setId(stock.getId());
        dto.setPartId(stock.getPart().getId());
        dto.setQuantity(stock.getQuantity());
        dto.setMinQuantity(stock.getMinQuantity());
        if (stock.getLocation() != null) {
            LocationMiniDTO locDTO = new LocationMiniDTO();
            locDTO.setId(stock.getLocation().getId());
            locDTO.setName(stock.getLocation().getName());
            locDTO.setAddress(stock.getLocation().getAddress());
            dto.setLocation(locDTO);
        }
        return dto;
    }
}
