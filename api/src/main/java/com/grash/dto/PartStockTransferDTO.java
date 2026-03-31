package com.grash.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Transfer stock between the main shop (Part.quantity) and a PartStock location,
 * or between two PartStock locations.
 *
 * fromType/toType = "shop" | "stock"
 * fromId/toId:
 *   - when type is "shop"  → the Part id
 *   - when type is "stock" → the PartStock id
 */
@Data
@NoArgsConstructor
public class PartStockTransferDTO {
    @NotNull
    private String fromType;   // "shop" | "stock"
    @NotNull
    private Long fromId;
    @NotNull
    private String toType;     // "shop" | "stock"
    @NotNull
    private Long toId;
    @Min(1)
    private double quantity;
}
