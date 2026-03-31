package com.grash.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
public class PartStockPatchDTO {
    @NotNull
    private Long partId;
    @NotNull
    private Long locationId;
    @Min(0)
    private double quantity;
    @Min(0)
    private double minQuantity;
}
