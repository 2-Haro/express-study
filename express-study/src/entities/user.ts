import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('increment') // creates a primary column which value will be automatically generated with an auto-increment value
  id!: number;

  @Column('text')
  name!: string;
}
