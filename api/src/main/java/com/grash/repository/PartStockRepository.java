package com.grash.repository;

import com.grash.model.PartStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;

public interface PartStockRepository extends JpaRepository<PartStock, Long> {
    Collection<PartStock> findByPart_Id(Long partId);
    Collection<PartStock> findByCompany_Id(Long companyId);
    Optional<PartStock> findByPart_IdAndLocation_Id(Long partId, Long locationId);
    void deleteByCompany_IdAndIsDemoTrue(Long companyId);
}
