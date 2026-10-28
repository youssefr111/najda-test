package com.najda.backend.user.model;

/** The 27 governorates of Egypt. Stored by name; clients show it in the user's language. */
public enum Governorate {
    CAIRO("Cairo"), GIZA("Giza"), ALEXANDRIA("Alexandria"), DAKAHLIA("Dakahlia"), RED_SEA("Red Sea"),
    BEHEIRA("Beheira"), FAYOUM("Faiyum"), GHARBIA("Gharbia"), ISMAILIA("Ismailia"), MONUFIA("Monufia"),
    MINYA("Minya"), QALYUBIA("Qalyubia"), NEW_VALLEY("New Valley"), SUEZ("Suez"), ASWAN("Aswan"),
    ASSIUT("Assiut"), BENI_SUEF("Beni Suef"), PORT_SAID("Port Said"), DAMIETTA("Damietta"), SHARKIA("Sharqia"),
    SOUTH_SINAI("South Sinai"), KAFR_EL_SHEIKH("Kafr El Sheikh"), MATROUH("Matrouh"), LUXOR("Luxor"),
    QENA("Qena"), NORTH_SINAI("North Sinai"), SOHAG("Sohag");

    private final String englishName;

    Governorate(String englishName) {
        this.englishName = englishName;
    }

    public String englishName() {
        return englishName;
    }
}
