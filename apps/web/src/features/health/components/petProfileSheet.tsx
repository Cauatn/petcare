import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	NativeSelect,
	NativeSelectOption,
} from '@/components/ui/native-select';
import { NumberInput } from '@/components/ui/numberInput';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { toast } from 'react-toastify';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import * as React from 'react';
import { bodyConditionLabels, dietLabels } from '../constants/healthReferences';
import { useSavePet } from '../composables/useSavePet';
import type {
	Pet,
	PetBodyCondition,
	PetDiet,
	SavePetPayload,
} from '../types/health';

function PetProfileForm({
	pet,
	onDone,
}: {
	pet: Pet | null;
	onDone: () => void;
}) {
	const [name, setName] = React.useState(pet?.name ?? '');
	const [weightKg, setWeightKg] = React.useState<number | undefined>(
		pet?.weightKg,
	);
	const [birthDate, setBirthDate] = React.useState(
		pet?.birthDate?.slice(0, 10) ?? '',
	);
	const [neutered, setNeutered] = React.useState(pet?.neutered ?? true);
	const [diet, setDiet] = React.useState<PetDiet>(pet?.diet ?? 'dry');
	const [bodyCondition, setBodyCondition] = React.useState<PetBodyCondition>(
		pet?.bodyCondition ?? 'ideal',
	);
	const [foodKcalPerKg, setFoodKcalPerKg] = React.useState<
		number | undefined
	>(pet?.foodKcalPerKg ?? undefined);
	const { mutate: savePet, isPending } = useSavePet();
	// Mesmos limites da API (pets.schemas.ts); fora deles o PUT volta 400
	const kcalValid =
		foodKcalPerKg == null ||
		(foodKcalPerKg >= 100 && foodKcalPerKg <= 6000);
	const isValid =
		name.trim().length > 0 &&
		weightKg != null &&
		weightKg >= 0.3 &&
		weightKg <= 15 &&
		kcalValid;

	return (
		<form
			id="pet-profile-form"
			className="flex flex-col gap-4 p-5"
			onSubmit={(event) => {
				event.preventDefault();
				if (!isValid) return;
				const payload: SavePetPayload = {
					name: name.trim(),
					weightKg: weightKg!,
					birthDate: birthDate || null,
					neutered,
					diet,
					bodyCondition,
					foodKcalPerKg: foodKcalPerKg ?? null,
				};
				savePet(payload, {
					onSuccess: onDone,
					onError: (error) =>
						toast.error(
							getErrorMessage(
								error,
								'Não foi possível salvar o perfil do gato.',
							),
						),
				});
			}}
		>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="pet-name">Nome</Label>
				<Input
					id="pet-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="pet-weight">Peso (kg)</Label>
					<NumberInput
						id="pet-weight"
						value={weightKg}
						onChange={setWeightKg}
						decimals={2}
						entryMode="freeDecimal"
						placeholder="Ex.: 4,2"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="pet-birth">Nascimento</Label>
					<Input
						id="pet-birth"
						type="date"
						value={birthDate}
						max={new Date().toISOString().slice(0, 10)}
						onChange={(e) => setBirthDate(e.target.value)}
					/>
				</div>
			</div>
			<label className="flex items-center gap-2 text-sm text-n-700">
				<Checkbox
					checked={neutered}
					onCheckedChange={(checked) => setNeutered(checked === true)}
					label="Castrado"
				/>
				Castrado
			</label>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="pet-diet">Dieta</Label>
				<NativeSelect
					id="pet-diet"
					value={diet}
					onChange={(e) => setDiet(e.target.value as PetDiet)}
				>
					{Object.entries(dietLabels).map(([value, label]) => (
						<NativeSelectOption key={value} value={value}>
							{label}
						</NativeSelectOption>
					))}
				</NativeSelect>
				<span className="text-xs text-n-500">
					Quem come ração úmida bebe bem menos água do pote.
				</span>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="pet-body">Condição corporal</Label>
				<NativeSelect
					id="pet-body"
					value={bodyCondition}
					onChange={(e) =>
						setBodyCondition(e.target.value as PetBodyCondition)
					}
				>
					{Object.entries(bodyConditionLabels).map(
						([value, label]) => (
							<NativeSelectOption key={value} value={value}>
								{label}
							</NativeSelectOption>
						),
					)}
				</NativeSelect>
				<span className="text-xs text-n-500">
					Peso ideal: costelas fáceis de sentir, mas não de ver.
				</span>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="pet-kcal">Energia da ração (kcal/kg)</Label>
				<NumberInput
					id="pet-kcal"
					value={foodKcalPerKg}
					onChange={setFoodKcalPerKg}
					placeholder="Opcional — está no rótulo"
				/>
				{kcalValid ? (
					<span className="text-xs text-n-500">
						Sem valor usamos a média: seca 3.800, úmida 900, mista
						2.350.
					</span>
				) : (
					<span className="text-xs text-r-600">
						Use um valor entre 100 e 6.000 kcal/kg (veja o rótulo da
						ração).
					</span>
				)}
			</div>
			<Button
				type="submit"
				size="brand-sm"
				disabled={!isValid}
				isLoading={isPending}
				className="self-end"
			>
				Salvar
			</Button>
		</form>
	);
}

type PetProfileSheetProps = {
	open: boolean;
	pet: Pet | null;
	onClose: () => void;
};

export function PetProfileSheet({ open, pet, onClose }: PetProfileSheetProps) {
	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-sm">
				<SheetHeader className="border-b border-n-30 p-5">
					<SheetTitle className="text-lg">
						{pet ? 'Perfil do gato' : 'Cadastrar gato'}
					</SheetTitle>
					<SheetDescription>
						Peso, idade e dieta definem as metas de água e ração.
					</SheetDescription>
				</SheetHeader>
				{open ? (
					<PetProfileForm
						key={pet?._id ?? 'new'}
						pet={pet}
						onDone={onClose}
					/>
				) : null}
				<SheetFooter className="mt-auto border-t border-n-30 p-5 text-xs text-n-500">
					Atualize o peso uma vez por mês para manter as metas certas.
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
