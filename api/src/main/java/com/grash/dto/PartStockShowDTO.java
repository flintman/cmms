package com.grash.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class PartStockShowDTO {
    private Long id;
    private Long partId;
    private LocationMiniDTO location;
    private double quantity;
    private double minQuantity;
}
