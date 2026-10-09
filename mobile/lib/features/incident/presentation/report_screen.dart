import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../map/location_picker_map.dart';
import '../application/incident_providers.dart';
import '../data/incident_repository.dart';
import '../domain/incident.dart';
import 'widgets/incident_type_selector.dart';
import 'widgets/injured_counter.dart';

enum _Stage { initial, confirmation, success }

/// The citizen SOS flow: big button -> details + location -> confirmation.
class ReportScreen extends ConsumerStatefulWidget {
  const ReportScreen({super.key});

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  final _description = TextEditingController();

  _Stage _stage = _Stage.initial;
  IncidentCategory? _category = IncidentCategory.medical;
  int _injuredCount = 0;
  PickedLocation? _pin;
  Incident? _submitted;
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    final category = _category;
    final pin = _pin;
    setState(() => _error = null);

    if (pin == null) {
      setState(() => _error = l10n.citizenReportLocationRequired);
      return;
    }
    if (category == null) return;

    setState(() => _submitting = true);
    try {
      final description = _description.text.trim();
      final incident = await ref.read(incidentRepositoryProvider).submit(
            SubmitIncidentRequest(
              category: category,
              textMessage: description.isEmpty ? null : description,
              latitude: pin.latitude,
              longitude: pin.longitude,
              locationSource: pin.source,
              injuredCount: _injuredCount,
            ),
          );
      ref.invalidate(myIncidentsProvider);
      if (mounted) {
        setState(() {
          _submitted = incident;
          _stage = _Stage.success;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _reset() => setState(() {
        _submitted = null;
        _category = IncidentCategory.medical;
        _injuredCount = 0;
        _description.clear();
        _pin = null;
        _error = null;
        _stage = _Stage.initial;
      });

  @override
  Widget build(BuildContext context) {
    return switch (_stage) {
      _Stage.success => _SuccessView(incident: _submitted!, onDone: _reset),
      _Stage.initial => _InitialView(onSos: () => setState(() => _stage = _Stage.confirmation)),
      _Stage.confirmation => _buildForm(context),
    };
  }

  Widget _buildForm(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              onPressed: () => setState(() => _stage = _Stage.initial),
              icon: Icon(Icons.arrow_back_ios_new, size: 16, color: p.textMuted),
              label: Text(l10n.citizenReportBack, style: TextStyle(color: p.textMuted)),
            ),
          ),
          const SizedBox(height: 8),
          IncidentTypeSelector(value: _category, onChanged: (c) => setState(() => _category = c)),
          const SizedBox(height: 24),
          AppTextField(
            label: l10n.citizenReportDescription,
            controller: _description,
            hintText: l10n.citizenReportDescriptionPlaceholder,
            minLines: 3,
            maxLines: 5,
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 24),
          InjuredCounter(value: _injuredCount, onChanged: (v) => setState(() => _injuredCount = v)),
          const SizedBox(height: 24),
          LocationPickerMap(value: _pin, onChanged: (pin) => setState(() => _pin = pin)),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.emergency),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _submitting || _category == null ? null : _submit,
            icon: const Icon(Icons.campaign, size: 20),
            label: Text(
              _submitting ? l10n.citizenReportSubmitting : l10n.citizenReportSubmitAlert,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.emergency,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(56),
              shape: const StadiumBorder(),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _InitialView extends StatelessWidget {
  const _InitialView({required this.onSos});

  final VoidCallback onSos;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ScreenScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          Text(
            l10n.citizenReportTitle,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: p.text),
          ),
          const SizedBox(height: 4),
          Text(l10n.citizenReportSubtitle, style: TextStyle(fontSize: 15, color: p.textMuted)),
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: 208,
                    width: 208,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          height: 208,
                          width: 208,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.emergency.withValues(alpha: 0.10),
                          ),
                        ),
                        Container(
                          height: 176,
                          width: 176,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.emergency.withValues(alpha: 0.15),
                          ),
                        ),
                        Material(
                          color: AppColors.emergency,
                          shape: const CircleBorder(),
                          elevation: 8,
                          child: InkWell(
                            customBorder: const CircleBorder(),
                            onTap: onSos,
                            child: SizedBox(
                              height: 144,
                              width: 144,
                              child: Center(
                                child: Text(
                                  l10n.citizenReportSosButton,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.5,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    l10n.citizenReportPressToCall,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.emergency),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.incident, required this.onDone});

  final Incident incident;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ScreenScaffold(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, size: 64, color: Color(0xFF166534)),
              const SizedBox(height: 12),
              Text(
                l10n.citizenReportAlertSent,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: p.text),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.citizenReportSubmittedToDispatch(incident.id),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: p.textMuted),
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () => context.push('/citizen/incident/${incident.id}'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.emergency,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: const StadiumBorder(),
                ),
                child: Text(
                  l10n.citizenReportViewReport,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: onDone,
                child: Text(
                  l10n.citizenReportDone,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.emergency),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
