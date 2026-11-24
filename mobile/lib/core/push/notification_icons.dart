import 'package:flutter/material.dart';

/// The icon that stands for a kind of notification: in the notifications list and in the in-app banner.
IconData notificationIcon(String type) => switch (type) {
  'MISSION_OFFERED' || 'MISSION_CANCELLED' => Icons.assignment_outlined,
  'INCIDENT_NEW' || 'INCIDENT_CANCELLED_BY_CITIZEN' => Icons.crisis_alert,
  'MISSION_REJECTED' ||
  'MISSION_WITHDRAWN' => Icons.report_gmailerrorred_outlined,
  'INCIDENT_ACCEPTED' || 'INCIDENT_EN_ROUTE' => Icons.directions_car_outlined,
  'INCIDENT_ARRIVED' => Icons.flag_outlined,
  'INCIDENT_RESOLVED' => Icons.check_circle_outline,
  'INCIDENT_CLOSED_FALSE_REPORT' ||
  'INCIDENT_CLOSED_DUPLICATE' => Icons.inventory_2_outlined,
  'CHAT_MESSAGE' => Icons.chat_bubble_outline,
  'APPLICATION_APPROVED' ||
  'APPLICATION_REJECTED' ||
  'APPLICATION_SUBMITTED' => Icons.badge_outlined,
  'PATIENT_INCOMING' => Icons.local_hospital_outlined,
  'LEGAL_UPDATED' => Icons.gavel_outlined,
  _ => Icons.notifications_none_rounded,
};