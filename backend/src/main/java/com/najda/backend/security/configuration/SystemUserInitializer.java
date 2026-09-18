package com.najda.backend.security.configuration;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.facility.service.FacilityService;
import com.najda.backend.security.util.TemporaryPasswordGenerator;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.user.model.Gender;
import com.najda.backend.user.model.Role;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.RoleRepository;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.service.FirebaseClaimsService;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
//import org.springframework.context.annotation.DependsOn;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(2)
//@DependsOn("systemRoleInitializer")
@RequiredArgsConstructor
public class SystemUserInitializer implements CommandLineRunner {

    private static final Logger logger =
            LoggerFactory.getLogger(SystemUserInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final FirebaseClaimsService firebaseClaimsService;
    private final ResponseUnitRepository responseUnitRepository;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;
    private final FacilityRepository facilityRepository;
    private final FacilityService facilityService;  

    @Override
    public void run(String... args) {
        Facility testHospital1 = ensureTestFacility("Najda Test Hospital 1", FacilityType.HOSPITAL, 30.0444, 31.2357);
        Facility testHospital2 = ensureTestFacility("Najda Test Hospital 2", FacilityType.HOSPITAL, 30.0626, 31.2497);
        Facility testAmbulanceStation = ensureTestFacility("Najda Test Ambulance Station", FacilityType.AMBULANCE_STATION, 30.0480, 31.2380);
        Facility testFireStation = ensureTestFacility("Najda Test Fire Station", FacilityType.FIRE_STATION, 30.0500, 31.2400);
        Facility testPoliceStation = ensureTestFacility("Najda Test Police Station", FacilityType.POLICE_STATION, 30.0550, 31.2450);


        bootstrapSystemUser(
                "BghcKPzvJtdBO8TuKB7wzHncnhI3",
                "superadmin1@najda.com",
                "Super Admin",
                "1",
                "+201000000001",
                "SUPER_ADMIN",
                "Egypt",
                Gender.MALE,
                null
        );

        bootstrapSystemUser(
                "sdADqWayzPP71gp2cpZEckkpycV2",
                "admin1@najda.com",
                "Admin",
                "1",
                "+201000000002",
                "ADMIN",
                "Egypt",
                Gender.MALE,
                testFireStation
        );

        bootstrapSystemUser(
                "glJMc72T8Ah0z6Ffft3kxCToaqe2",
                "firefighter1@najda.com",
                "FireFighter",
                "1",
                "+201000000003",
                "FIREFIGHTER",
                "Egypt",
                Gender.MALE,
                testFireStation
        );

        bootstrapSystemUser(
                "oMyB42xzVMZFMnkMgvLY0D658M42",
                "firefighter2@najda.com",
                "FireFighter",
                "2",
                "+201000000004",
                "FIREFIGHTER",
                "Egypt",
                Gender.MALE,
                testFireStation
        );

        bootstrapSystemUser(
                "6DataGhz8be2OlNwIHXpteri2l92",
                "police1@najda.com",
                "Police",
                "1",
                "+201000000005",
                "POLICE",
                "Egypt",
                Gender.MALE,
                testPoliceStation
        );

        bootstrapSystemUser(
                "dg7lDwN4WRagvnApyKauaRpXTK53",
                "police2@najda.com",
                "Police",
                "2",
                "+201000000006",
                "POLICE",
                "Egypt",
                Gender.MALE,
                testPoliceStation
        );

        bootstrapSystemUser(
                "XKe00goFYBQdBP5FaqG8TaMRS4n1",
                "ambulance1@najda.com",
                "Ambulance",
                "Crew 1",
                "+201000000007",
                "AMBULANCE_CREW",
                "Egypt",
                Gender.MALE,
                testAmbulanceStation
        );

        bootstrapSystemUser(
                "mhWkAtxqnzV5r8xwHnWqyqKQOHr1",
                "ambulance2@najda.com",
                "Ambulance",
                "Crew 2",
                "+201000000008",
                "AMBULANCE_CREW",
                "Egypt",
                Gender.MALE,
                testAmbulanceStation
        );

        bootstrapSystemUser(
                "OoDiMSZx6DeWglXWaWAj6V4fEgm2",
                "dispatcher1@najda.com",
                "Dispatcher",
                "1",
                "+201000000009",
                "DISPATCHER",
                "Egypt",
                Gender.MALE,
                null
        );

        bootstrapSystemUser(
                "3uuamZf5KaRbKC0hgX6zUj5biD23",
                "dispatcher2@najda.com",
                "Dispatcher",
                "2",
                "+201000000010",
                "DISPATCHER",
                "Egypt",
                Gender.MALE,
                null
        );

        bootstrapSystemUser(
                "ub5auHk1r4Qo0GPg9EFJVutWgkC2",
                "firstresponder1@najda.com",
                "First Responder",
                "1",
                "+201000000011",
                "FIRST_RESPONDER",
                "Egypt",
                Gender.MALE,
                null
        );

        bootstrapSystemUser(
                "5JhCQjUkt8QVJOAWmvOi5D3WUi13",
                "firstresponder2@najda.com",
                "First Responder",
                "2",
                "+201000000012",
                "FIRST_RESPONDER",
                "Egypt",
                Gender.MALE,
                null
        );

        bootstrapSystemUser(
                "tcaPrlw7AdcFz4capcLtFQrwc6p1",
                "hospital1@najda.com",
                "Hospital",
                "Staff 1",
                "+201000000013",
                "HOSPITAL_STAFF",
                "Egypt",
                Gender.MALE,
                testHospital1
        );

        bootstrapSystemUser(
                "jYSJ0hmrdST2I0l7e4qGIU9306g2",
                "hospital2@najda.com",
                "Hospital",
                "Staff 2",
                "+201000000014",
                "HOSPITAL_STAFF",
                "Egypt",
                Gender.MALE,
                testHospital2
        );
    }

    private Facility ensureTestFacility(String name, FacilityType type, double lat, double lon) {
        return facilityRepository.findAll().stream()
                .filter(f -> f.getName().equals(name) && f.getFacilityType() == type)
                .findFirst()
                .orElseGet(() -> {
                        Facility f = new Facility();
                        f.setName(name);
                        f.setLatitude(lat);
                        f.setLongitude(lon);
                        f.setFacilityType(type);
                        f.setRegistered(false);
                        return facilityRepository.save(f);
        });
    }

    private void bootstrapSystemUser(
            String firebaseUid,
            String email,
            String firstName,
            String lastName,
            String phone,
            String roleName,
            String address,
            Gender gender,
            Facility facility
    ) {

        /*
         * First check our database.
         * This makes the initializer safe to run on every application startup.
         */
        if (userRepository.findByFirebaseUid(firebaseUid).isPresent()) {
            logger.info(
                    "System user bootstrap skipped -- a User already exists for UID {}",
                    firebaseUid
            );
            return;
        }

        Role role = roleRepository.findByRoleNameIgnoreCase(roleName)
                .orElseThrow(() ->
                        new IllegalStateException(
                                roleName + " role missing after role seeding"
                        )
                );

        /*
         * Check Firebase first.
         *
         * If the account already exists, reuse it.
         * Otherwise create it with the supplied UID and a random temporary
         * password.
         */
        UserRecord firebaseUser =
                getOrCreateFirebaseUser(
                        firebaseUid,
                        email,
                        firstName,
                        lastName
                );

        User user = new User();

        user.setFirebaseUid(firebaseUser.getUid());
        user.setEmail(
                firebaseUser.getEmail() != null
                        ? firebaseUser.getEmail()
                        : email
        );
        user.setPhone(
                firebaseUser.getPhoneNumber() != null
                        ? firebaseUser.getPhoneNumber()
                        : phone
        );
        user.setPhoneVerified(
                firebaseUser.getPhoneNumber() != null
        );
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole(role);
        user.setAddress(address);
        user.setProfileCompleted(true);
        user.setGender(gender);
        user.setFacility(facility);

        userRepository.save(user);
        if (facility != null) facilityService.markRegistered(facility.getId());

        firebaseClaimsService.syncRoleClaim(
                firebaseUser.getUid(),
                role.getRoleName()
        );

        /*
         * Same behavior as registerEmployee():
         * FIRST_RESPONDER accounts receive a personal response unit.
         */
        if (role.getRoleName().equalsIgnoreCase("FIRST_RESPONDER")) {

            ResponseUnit personalUnit = new ResponseUnit();

            personalUnit.setUnitType(UnitType.FIRST_RESPONDER);
            personalUnit.setStatus(UnitStatus.OFFLINE);
            personalUnit.setAssignedEmployee(user);

            // plateNumber and station intentionally left null

            responseUnitRepository.save(personalUnit);
        }

        logger.info(
                "Bootstrapped system user {} ({}) with role {}",
                email,
                firebaseUser.getUid(),
                role.getRoleName()
        );
    }

    private UserRecord getOrCreateFirebaseUser(
            String firebaseUid,
            String email,
            String firstName,
            String lastName
    ) {

        /*
         * Check whether the Firebase account already exists.
         */
        try {
            return FirebaseAuth.getInstance().getUser(firebaseUid);

        } catch (FirebaseAuthException e) {

            /*
             * Firebase account does not exist.
             *
             * Create it using the exact UID from the seed data and a
             * throwaway password.
             */
            String temporaryPassword =
                    temporaryPasswordGenerator.generate();

            UserRecord.CreateRequest createRequest =
                    new UserRecord.CreateRequest()
                            .setUid(firebaseUid)
                            .setEmail(email)
                            .setPassword(temporaryPassword)
                            .setDisplayName(firstName + " " + lastName)
                            .setEmailVerified(true);

            try {
                UserRecord firebaseUser =
                        FirebaseAuth.getInstance().createUser(createRequest);

                logger.info(
                        "Created Firebase system account {} with UID {}",
                        email,
                        firebaseUser.getUid()
                );

                return firebaseUser;

            } catch (FirebaseAuthException createException) {

                throw new IllegalStateException(
                        "Could not create Firebase system account "
                                + email
                                + ": "
                                + createException.getMessage(),
                        createException
                );
            }
        }
    }
}
