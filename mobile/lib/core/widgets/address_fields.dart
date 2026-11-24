import 'package:flutter/material.dart';

import '../../features/settings/presentation/widgets/settings_widgets.dart';
import '../address/address.dart';
import '../l10n/l10n_x.dart';
import 'app_text_field.dart';
import 'pill_select.dart';

/// The structured address (governorate, city, street, landmark): the same on every form that asks for one.
/// Errors appear once [showErrors] is true (after the first submit attempt), not while someone is still typing.
class AddressFields extends StatefulWidget {
  const AddressFields({required this.value, required this.onChanged, super.key, this.showErrors = false});

  final AddressValue value;
  final ValueChanged<AddressValue> onChanged;
  final bool showErrors;

  @override
  State<AddressFields> createState() => _AddressFieldsState();
}

class _AddressFieldsState extends State<AddressFields> {
  late final _city = TextEditingController(text: widget.value.city);
  late final _street = TextEditingController(text: widget.value.street);
  late final _landmark = TextEditingController(text: widget.value.landmark);
  late AddressValue _value = widget.value;

  @override
  void dispose() {
    _city.dispose();
    _street.dispose();
    _landmark.dispose();
    super.dispose();
  }

  void _emit(AddressValue next) {
    setState(() => _value = next);
    widget.onChanged(next);
  }

  String? _errorText(AddressField field) {
    if (!widget.showErrors) return null;
    final error = _value.validate()[field];
    if (error == null) return null;
    final l10n = context.l10n;
    return switch (error) {
      AddressError.required => l10n.addressErrorRequired,
      AddressError.tooShort => l10n.addressErrorTooShort,
      AddressError.invalid => l10n.addressErrorInvalid,
    };
  }

  Future<void> _pickGovernorate() async {
    final l10n = context.l10n;
    final language = Localizations.localeOf(context).languageCode;
    final picked = await showChoiceSheet<String>(
      context,
      title: l10n.addressGovernorate,
      options: [for (final g in governorates) g.code],
      value: _value.governorate,
      labelOf: (code) => governorateByCode(code)?.label(language) ?? code,
    );
    if (picked != null) _emit(_value.copyWith(governorate: picked));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final language = Localizations.localeOf(context).languageCode;
    final governorateError = _errorText(AddressField.governorate);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PillSelect(
          label: l10n.addressGovernorate,
          value: governorateByCode(_value.governorate)?.label(language),
          hint: l10n.addressGovernoratePlaceholder,
          icon: Icons.location_city_outlined,
          hasError: governorateError != null,
          onTap: _pickGovernorate,
        ),
        if (governorateError != null)
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 16, top: 4),
            child: Text(governorateError, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.error)),
          ),
        const SizedBox(height: 12),
        AppTextField(
          label: l10n.addressCity,
          controller: _city,
          hintText: l10n.addressCityPlaceholder,
          errorText: _errorText(AddressField.city),
          maxLength: 100,
          textCapitalization: TextCapitalization.words,
          autofillHints: const [AutofillHints.addressCity],
          onChanged: (v) => _emit(_value.copyWith(city: v)),
        ),
        const SizedBox(height: 12),
        AppTextField(
          label: l10n.addressStreet,
          controller: _street,
          hintText: l10n.addressStreetPlaceholder,
          errorText: _errorText(AddressField.street),
          maxLength: 200,
          textCapitalization: TextCapitalization.words,
          autofillHints: const [AutofillHints.fullStreetAddress],
          onChanged: (v) => _emit(_value.copyWith(street: v)),
        ),
        const SizedBox(height: 12),
        AppTextField(
          label: '${l10n.addressLandmark} (${l10n.addressOptional})',
          controller: _landmark,
          hintText: l10n.addressLandmarkPlaceholder,
          errorText: _errorText(AddressField.landmark),
          maxLength: 200,
          textCapitalization: TextCapitalization.sentences,
          onChanged: (v) => _emit(_value.copyWith(landmark: v)),
        ),
      ],
    );
  }
}
